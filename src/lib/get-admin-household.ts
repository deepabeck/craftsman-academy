import { createClient } from "@/lib/supabase/server";

/**
 * Returns the household_id for the currently authenticated user.
 * Used by admin pages to scope queries to their own household only.
 * Returns null if the user has no session (should not happen on authenticated routes).
 */
export async function getAdminHouseholdId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("household_id").eq("id", user.id).single();
  return data?.household_id ?? null;
}
