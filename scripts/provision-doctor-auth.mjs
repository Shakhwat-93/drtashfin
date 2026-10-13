#!/usr/bin/env node
/**
 * Server-side administrative provisioning script for the authorized clinician account.
 * Reads credentials strictly from environment variables (DOCTOR_EMAIL, DOCTOR_INITIAL_PASSWORD,
 * NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
 * Never hardcodes secrets in source code.
 */

import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const doctorEmail = (
    process.env.DOCTOR_EMAIL || "drtashfinahmed@gmail.com"
  ).trim().toLowerCase();
  const initialPassword = process.env.DOCTOR_INITIAL_PASSWORD;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
    );
    process.exit(1);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // 1. Check if doctor account already exists in auth.users
  const { data: usersList, error: listErr } =
    await adminClient.auth.admin.listUsers();
  if (listErr) {
    console.error("ERROR listing auth users:", listErr.message);
    process.exit(1);
  }

  let doctorAuthUser = usersList.users.find(
    (u) => u.email?.toLowerCase() === doctorEmail
  );

  if (!doctorAuthUser) {
    if (!initialPassword || initialPassword.length < 10) {
      console.error(
        "ERROR: DOCTOR_INITIAL_PASSWORD (min 10 chars) is required to create the initial doctor account."
      );
      process.exit(1);
    }

    const { data: created, error: createErr } =
      await adminClient.auth.admin.createUser({
        email: doctorEmail,
        password: initialPassword,
        email_confirm: true,
        app_metadata: {
          role: "doctor",
          doctor_code: "dr-tashfin",
        },
        user_metadata: {
          name: "Dr. Tashfin Ahmed",
          specialty: "Cardiology & Medicine",
        },
      });

    if (createErr || !created?.user) {
      console.error("ERROR creating doctor auth user:", createErr?.message);
      process.exit(1);
    }

    doctorAuthUser = created.user;
    console.log(
      `[OK] Created Supabase Auth user for ${doctorEmail} (ID: ${doctorAuthUser.id})`
    );
  } else {
    // Ensure app_metadata role and email confirmation are set
    const updateAttrs = {
      email_confirm: true,
      app_metadata: {
        ...(doctorAuthUser.app_metadata || {}),
        role: "doctor",
        doctor_code: "dr-tashfin",
      },
      user_metadata: {
        ...(doctorAuthUser.user_metadata || {}),
        name: "Dr. Tashfin Ahmed",
        specialty: "Cardiology & Medicine",
      },
    };
    if (initialPassword && initialPassword.length >= 10) {
      updateAttrs.password = initialPassword;
    }

    const { error: updErr } = await adminClient.auth.admin.updateUserById(
      doctorAuthUser.id,
      updateAttrs
    );
    if (updErr) {
      console.error("ERROR updating doctor auth user:", updErr.message);
      process.exit(1);
    }
    console.log(
      `[OK] Verified existing Supabase Auth user for ${doctorEmail} (ID: ${doctorAuthUser.id})`
    );
  }

  // 2. Upsert into public.authorized_doctors registry
  const { error: regErr } = await adminClient
    .from("authorized_doctors")
    .upsert(
      {
        user_id: doctorAuthUser.id,
        doctor_code: "dr-tashfin",
        email: doctorEmail,
        full_name: "Dr. Tashfin Ahmed",
        specialty: "Cardiology & Medicine",
        is_active: true,
      },
      { onConflict: "user_id" }
    );

  if (regErr) {
    console.error("ERROR registering in authorized_doctors:", regErr.message);
    process.exit(1);
  }

  console.log(
    `[SUCCESS] Doctor ${doctorEmail} (ID: ${doctorAuthUser.id}) is active in public.authorized_doctors.`
  );
}

main();
