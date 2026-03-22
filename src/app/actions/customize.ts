"use server";

import { createClient } from "@/lib/supabase/server";

/** Save the student's accent color to profiles.color */
export async function saveStudentColor(color: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ color })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return {};
}

/** Save the student's background hue to user_settings.bg_color */
export async function saveBgColor(bgColor: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, bg_color: bgColor }, { onConflict: "user_id" });

  if (error) return { error: error.message };
  return {};
}

/** Load the student's saved color + bg_color from DB */
export async function getStudentSettings(): Promise<{ color: string; bgColor: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { color: "#4A90D0", bgColor: "#1A3A5C" };

  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase.from("profiles").select("color").eq("id", user.id).single(),
    supabase.from("user_settings").select("bg_color").eq("user_id", user.id).single(),
  ]);

  return {
    color: profile?.color ?? "#4A90D0",
    bgColor: settings?.bg_color ?? "#1A3A5C",
  };
}
