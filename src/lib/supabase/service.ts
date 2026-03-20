import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — server-side only.
 * Bypasses RLS. Used only for calling SECURITY DEFINER functions
 * (generate_daily_tasks, mark_missed_tasks) from Server Components / Actions.
 * Never expose this client or the service key to the browser.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service role env vars");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
