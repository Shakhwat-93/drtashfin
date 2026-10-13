import { createClient } from "@supabase/supabase-js";

const serverSupabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

if (
  typeof window === "undefined" &&
  (!process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
) {
  // Helpful development warning if credentials are missing
  console.warn(
    "[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment variables. Falling back to build placeholder."
  );
}

/**
 * Resolves the appropriate Supabase endpoint:
 * - In the browser, routes through same-origin `/api/supabase` gateway so requests
 *   use HTTPS and automatically include HttpOnly session cookies.
 * - On the server / CLI / tests, connects directly to NEXT_PUBLIC_SUPABASE_URL.
 */
const resolvedSupabaseUrl =
  typeof window !== "undefined"
    ? `${window.location.origin}/api/supabase`
    : serverSupabaseUrl;

/**
 * Supabase client instance.
 * Enforces Row-Level Security (RLS) via verified clinician JWT.
 */
export const supabase = createClient(resolvedSupabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
