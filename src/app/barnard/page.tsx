import { createServiceClient } from "@/lib/supabase/service";
import { BarnardLoginClient } from "./barnard-client";

// Always fetch fresh data — do not statically prerender
export const dynamic = "force-dynamic";

export interface BarnardProfileData {
  avatarUrl: string | null;
  tagline: string;
}

/**
 * Fetch avatar URLs and taglines for Barnard household profiles.
 *
 * Strategy: find the admin user by email → get their household_id → fetch
 * ALL profiles for that household → join back to auth.users for the email key.
 *
 * This avoids relying on NEXT_PUBLIC_* env vars server-side (they're only
 * reliably inlined at build time for the client bundle, not always available
 * as process.env on the server at runtime).
 */
async function fetchProfileMap(): Promise<Record<string, BarnardProfileData>> {
  const adminEmail = process.env.NEXT_PUBLIC_BARNARD_ADMIN_EMAIL;
  if (!adminEmail) return {};

  const service = createServiceClient();

  // 1. List all auth users (small set, ≤ 50 ever)
  const { data: authData } = await service.auth.admin.listUsers({ perPage: 200 });
  const authUsers = authData?.users ?? [];

  // 2. Find the Barnard admin auth user by their known email
  const adminAuthUser = authUsers.find((u) => u.email === adminEmail);
  if (!adminAuthUser) return {};

  // 3. Get the admin's household_id from their profile
  const { data: adminProfile } = await service
    .from("profiles")
    .select("household_id")
    .eq("id", adminAuthUser.id)
    .maybeSingle();

  const householdId = adminProfile?.household_id;
  if (!householdId) return {};

  // 4. Fetch ALL profiles for this household in one query
  const { data: profiles } = await service
    .from("profiles")
    .select("id, avatar_url, tagline")
    .eq("household_id", householdId);

  if (!profiles || profiles.length === 0) return {};

  // 5. Build email → { avatarUrl, tagline } map by joining profile.id → auth user email
  const profileById = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const profileMap: Record<string, BarnardProfileData> = {};

  for (const u of authUsers) {
    if (!u.email) continue;
    const profile = profileById[u.id];
    if (profile) {
      profileMap[u.email] = {
        avatarUrl: profile.avatar_url ?? null,
        tagline: profile.tagline ?? "",
      };
    }
  }

  return profileMap;
}

export default async function BarnardPage() {
  const profileMap = await fetchProfileMap();
  return <BarnardLoginClient profileMap={profileMap} />;
}
