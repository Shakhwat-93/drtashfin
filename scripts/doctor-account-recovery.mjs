#!/usr/bin/env node
/**
 * ============================================================================
 * Doctor Account Recovery, MFA Emergency Reset & Status Utility
 * ============================================================================
 * Safe, non-destructive administrative CLI for single-clinician recovery:
 *
 *   node scripts/doctor-account-recovery.mjs --status
 *     Inspects the authorized doctor's auth.users status, MFA factors, and
 *     public.authorized_doctors entry without printing any secrets.
 *
 *   node scripts/doctor-account-recovery.mjs --generate-token
 *     Issues a cryptographically signed one-time GoTrue recovery `token_hash`
 *     for `drtashfinahmed@gmail.com` via the Supabase Admin API so the doctor
 *     can complete `/reset-password?token_hash=<hash>` in the browser even
 *     when outbound SMTP is not configured.
 *
 *   node scripts/doctor-account-recovery.mjs --reset-mfa
 *     Safely removes enrolled TOTP MFA factors via the Supabase Admin API if
 *     the clinician loses their authenticator device.
 * ============================================================================
 */

import { createClient } from "@supabase/supabase-js";

const DOCTOR_EMAIL = (
  process.env.DOCTOR_EMAIL || "drtashfinahmed@gmail.com"
).toLowerCase();

const SUPABASE_URL =
  process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "ERROR: Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function findDoctorUser() {
  const { data: listData, error: listErr } =
    await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });
  if (listErr) {
    throw new Error(`Failed to list auth users: ${listErr.message}`);
  }
  const user = (listData?.users || []).find(
    (u) => (u.email || "").toLowerCase() === DOCTOR_EMAIL
  );
  if (!user) {
    throw new Error(
      `Authorized doctor user (${DOCTOR_EMAIL}) not found in auth.users.`
    );
  }
  return user;
}

async function run() {
  const args = process.argv.slice(2);
  const action = args[0] || "--status";

  const user = await findDoctorUser();

  const { data: registryRow } = await adminClient
    .from("authorized_doctors")
    .select("user_id, doctor_code, email, full_name, is_active, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: factorsData } = await adminClient.auth.admin.mfa.listFactors({
    userId: user.id,
  });
  const factors = factorsData?.factors || [];

  if (action === "--status") {
    console.log(
      JSON.stringify(
        {
          status: "OK",
          doctor: {
            userId: user.id,
            email: user.email,
            emailConfirmed: Boolean(user.email_confirmed_at),
            lastSignInAt: user.last_sign_in_at || null,
            registryActive: Boolean(registryRow?.is_active),
            doctorCode: registryRow?.doctor_code || null,
          },
          mfa: {
            totalFactors: factors.length,
            verifiedTotpFactors: factors.filter(
              (f) => f.factor_type === "totp" && f.status === "verified"
            ).length,
            unverifiedFactors: factors.filter((f) => f.status !== "verified")
              .length,
          },
        },
        null,
        2
      )
    );
    return;
  }

  if (action === "--generate-token") {
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: DOCTOR_EMAIL,
    });
    if (error || !data?.properties?.hashed_token) {
      throw new Error(
        `Failed to generate recovery token: ${error?.message || "missing hashed_token"}`
      );
    }

    console.log("==========================================================");
    console.log("ONE-TIME CLINICIAN RECOVERY TOKEN GENERATED");
    console.log("Account:", DOCTOR_EMAIL);
    console.log("Recovery Path: /reset-password (Tab 2: Verify Token & Reset)");
    console.log("Token Hash:", data.properties.hashed_token);
    console.log("==========================================================");
    return;
  }

  if (action === "--reset-mfa") {
    let removedCount = 0;
    for (const factor of factors) {
      const { error: delErr } = await adminClient.auth.admin.mfa.deleteFactor({
        id: factor.id,
        userId: user.id,
      });
      if (delErr) {
        throw new Error(
          `Failed to delete MFA factor ${factor.id}: ${delErr.message}`
        );
      }
      removedCount++;
    }

    console.log(
      JSON.stringify(
        {
          status: "MFA_RESET_COMPLETE",
          email: DOCTOR_EMAIL,
          removedFactorsCount: removedCount,
        },
        null,
        2
      )
    );
    return;
  }

  console.error(
    "Usage: node scripts/doctor-account-recovery.mjs [--status | --generate-token | --reset-mfa]"
  );
  process.exit(1);
}

run().catch((err) => {
  console.error("[Account Recovery Error]:", err.message || err);
  process.exit(1);
});
