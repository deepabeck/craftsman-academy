import { createServiceClient } from "@/lib/supabase/service";
import { LoginClient } from "./login-client";

// Always fetch fresh data — do not statically prerender
export const dynamic = "force-dynamic";

export interface LoginProfileData {
  avatarUrl: string | null;
  tagline: string;
}

/**
 * Fetch avatar URLs and taglines for the Craftsman Academy household's three
 * login tiles (admin + two students), keyed by email so the client can match
 * them to the NEXT_PUBLIC_* env-configured tile definitions.
 *
 * Mirrors the Barnard household's fetchProfileMap() in src/app/barnard/page.tsx
 * — same reasoning applies: this avoids relying on NEXT_PUBLIC_* env vars for
 * the actual lookup key (profiles has no email column), and avoids baking a
 * static image path into the client bundle, which is what let uploaded
 * profile photos (Admin → Profiles) silently never show up on this screen.
 */
async function fetchProfileMap(): Promise<Record<string, LoginProfileData>> {
  const service = createServiceClient();

  const { data: authData } = await service.auth.admin.listUsers({ perPage: 200 });
  const authUsers = authData?.users ?? [];
  if (authUsers.length === 0) return {};

  const emails = [
    process.env.NEXT_PUBLIC_ADMIN_EMAIL,
    process.env.NEXT_PUBLIC_STUDENT1_EMAIL,
    process.env.NEXT_PUBLIC_STUDENT2_EMAIL,
  ].filter((e): e is string => !!e);

  const relevantAuthUsers = authUsers.filter((u) => u.email && emails.includes(u.email));
  if (relevantAuthUsers.length === 0) return {};

  const ids = relevantAuthUsers.map((u) => u.id);
  const { data: profiles } = await service.from("profiles").select("id, avatar_url, tagline").in("id", ids);

  if (!profiles || profiles.length === 0) return {};

  const profileById = Object.fromEntries(profiles.map((p) => [p.id, p]));
  const profileMap: Record<string, LoginProfileData> = {};

  for (const u of relevantAuthUsers) {
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

export default async function LoginPage() {
  const profileMap = await fetchProfileMap();
  return <LoginClient profileMap={profileMap} />;
}
