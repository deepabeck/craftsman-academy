import { createClient } from "@/lib/supabase/server";
import { CustomizeClient } from "./customize-client";

export default async function CustomizePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase.from("profiles").select("color, display_name, student_key").eq("id", user?.id ?? "").single(),
    supabase.from("user_settings").select("bg_color").eq("user_id", user?.id ?? "").single(),
  ]);

  return (
    <CustomizeClient
      initialColor={profile?.color ?? "#4A90D0"}
      initialBgColor={settings?.bg_color ?? "#1A3A5C"}
      studentKey={profile?.student_key ?? "deven"}
      displayName={profile?.display_name ?? "Student"}
    />
  );
}
