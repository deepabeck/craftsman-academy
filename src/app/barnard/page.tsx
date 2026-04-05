import { createServiceClient } from "@/lib/supabase/service";
import { BarnardLoginClient } from "./barnard-client";

/** Fetch avatar URLs for Barnard household profiles by looking up emails in auth.users */
async function fetchAvatarMap(): Promise<Record<string, string | null>> {
  const emails = [
    process.env.NEXT_PUBLIC_BARNARD_ADMIN_EMAIL,
    process.env.NEXT_PUBLIC_BARNARD_STUDENT1_EMAIL,
    process.env.NEXT_PUBLIC_BARNARD_STUDENT2_EMAIL,
  ].filter(Boolean) as string[];

  if (emails.length === 0) return {};

  const service = createServiceClient();
  const { data: authData } = await service.auth.admin.listUsers({ perPage: 200 });
  const authUsers = authData?.users ?? [];

  const avatarMap: Record<string, string | null> = {};
  const ids = authUsers.filter((u) => u.email && emails.includes(u.email)).map((u) => u.id);

  if (ids.length > 0) {
    const { data: profiles } = await service.from("profiles").select("id, avatar_url").in("id", ids);

    for (const u of authUsers) {
      if (!u.email || !emails.includes(u.email)) continue;
      const profile = (profiles ?? []).find((p) => p.id === u.id);
      avatarMap[u.email] = profile?.avatar_url ?? null;
    }
  }

  return avatarMap;
}

export default async function BarnardPage() {
  const avatarMap = await fetchAvatarMap();
  return <BarnardLoginClient avatarMap={avatarMap} />;
}
