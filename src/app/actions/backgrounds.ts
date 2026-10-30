"use server";

import { lastFinishedWeekStart, maybeAwardWeeklyBackground, todayInAppTz, weekStartOf } from "@/lib/background-unlocks";
import { BACKGROUNDS } from "@/lib/backgrounds";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export interface BackgroundState {
  /** Backgrounds this user can use. Admins can use every background. */
  ownedIds: string[];
  /** Currently displayed background, or null for none. */
  selectedId: string | null;
  /** Unlocked but not yet shown to the student (oldest first). */
  pendingReveal: string[];
  total: number;
  isAdmin: boolean;
}

/**
 * Everything the UI needs about the signed-in user's background collection.
 * For students this also checks this week (from Friday on) and the most recently
 * finished week, so an unlock lands as soon as everything is checked off, even if
 * the weekly cron missed it or a task was approved late.
 */
export async function getBackgroundState(): Promise<BackgroundState | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const { data: profile } = await service.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin";

  const { data: settings } = await supabase.from("user_settings").select("background").eq("user_id", user.id).single();
  const selected = BACKGROUNDS.some((b) => b.id === settings?.background) ? (settings?.background as string) : null;

  if (isAdmin) {
    return {
      ownedIds: BACKGROUNDS.map((b) => b.id),
      selectedId: selected,
      pendingReveal: [],
      total: BACKGROUNDS.length,
      isAdmin,
    };
  }

  const today = todayInAppTz();
  for (const week of Array.from(new Set([lastFinishedWeekStart(today), weekStartOf(today)]))) {
    try {
      await maybeAwardWeeklyBackground(user.id, week);
    } catch (e) {
      console.error("[backgrounds] weekly check failed:", e);
    }
  }

  const { data: rows } = await service
    .from("background_unlocks")
    .select("background_id, revealed_at, unlocked_at")
    .eq("student_id", user.id)
    .order("unlocked_at", { ascending: true });

  const valid = (rows ?? []).filter((r) => BACKGROUNDS.some((b) => b.id === r.background_id));
  return {
    ownedIds: valid.map((r) => r.background_id as string),
    selectedId: selected,
    pendingReveal: valid.filter((r) => !r.revealed_at).map((r) => r.background_id as string),
    total: BACKGROUNDS.length,
    isAdmin,
  };
}

/** Record that the student has seen the reveal for these backgrounds. */
export async function markBackgroundsRevealed(ids: string[]): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || ids.length === 0) return;
  const service = createServiceClient();
  await service
    .from("background_unlocks")
    .update({ revealed_at: new Date().toISOString() })
    .eq("student_id", user.id)
    .in("background_id", ids)
    .is("revealed_at", null);
}

/** Choose the background to display (null = none). Only owned backgrounds are allowed. */
export async function selectBackground(backgroundId: string | null): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (backgroundId !== null) {
    if (!BACKGROUNDS.some((b) => b.id === backgroundId)) return { error: "Unknown background" };
    const service = createServiceClient();
    const { data: profile } = await service.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      const { data: row } = await service
        .from("background_unlocks")
        .select("id")
        .eq("student_id", user.id)
        .eq("background_id", backgroundId)
        .maybeSingle();
      if (!row) return { error: "That background isn't unlocked yet" };
    }
  }

  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, background: backgroundId }, { onConflict: "user_id" });
  if (error) return { error: error.message };
  return {};
}
