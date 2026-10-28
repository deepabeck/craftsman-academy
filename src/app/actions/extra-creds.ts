"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const APP_TZ = process.env.APP_TIMEZONE ?? "America/Denver";

export type RepeatRule = "once" | "daily" | "weekly" | "unlimited";

export interface ExtraCredsTask {
  id: string;
  title: string;
  description: string;
  icon: string;
  reward: number;
  shareable: boolean;
  repeatRule: RepeatRule;
  isActive: boolean;
  sortOrder: number;
}

export interface ExtraCredsPerson {
  id: string;
  name: string;
  color: string;
}

export interface ExtraCredsClaim {
  id: string;
  status: "pending" | "approved" | "rejected";
  taskId: string;
  taskTitle: string;
  taskIcon: string;
  reward: number;
  submittedBy: string;
  submittedAt: string;
  reviewedAt: string | null;
  adminNote: string | null;
  beforeUrl: string | null;
  afterUrl: string | null;
  participants: { id: string; name: string; color: string; amount: number | null }[];
}

export type TaskState = "available" | "pending" | "done";

// ── helpers ──────────────────────────────────────────────────────────────────

function todayLocal(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: APP_TZ });
}

function weekMonday(): string {
  const d = new Date(`${todayLocal()}T12:00:00`);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return d.toLocaleDateString("en-CA");
}

async function requireAdmin(): Promise<{ householdId: string; userId: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role, household_id").eq("id", user.id).single();
  if (!data || data.role !== "admin" || !data.household_id) return null;
  return { householdId: data.household_id as string, userId: user.id };
}

async function requireStudent(): Promise<{
  userId: string;
  studentKey: string;
  householdId: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role, student_key, household_id").eq("id", user.id).single();
  if (!data || data.role !== "student" || !data.household_id || !data.student_key) return null;
  return { userId: user.id, studentKey: data.student_key as string, householdId: data.household_id as string };
}

function mapTask(r: Record<string, unknown>): ExtraCredsTask {
  return {
    id: r.id as string,
    title: r.title as string,
    description: (r.description as string) ?? "",
    icon: (r.icon as string) ?? "tidy",
    reward: r.reward as number,
    shareable: (r.shareable as boolean) ?? true,
    repeatRule: (r.repeat_rule as RepeatRule) ?? "once",
    isActive: (r.is_active as boolean) ?? true,
    sortOrder: (r.sort_order as number) ?? 0,
  };
}

const TASK_COLS = "id, title, description, icon, reward, shareable, repeat_rule, is_active, sort_order";

async function signedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const service = createServiceClient();
  const { data } = await service.storage.from("submissions").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

async function loadClaims(householdId: string, statuses: string[], limit = 100): Promise<ExtraCredsClaim[]> {
  const service = createServiceClient();
  const { data } = await service
    .from("extra_creds_claims")
    .select(
      `id, status, task_id, submitted_by, submitted_at, reviewed_at, admin_note, before_path, after_path,
       task:extra_creds_tasks(title, icon, reward),
       participants:extra_creds_participants(student_id, amount, student:profiles(display_name, color))`,
    )
    .eq("household_id", householdId)
    .in("status", statuses)
    .order("submitted_at", { ascending: statuses.includes("pending") && statuses.length === 1 })
    .limit(limit);
  const rows = (data ?? []) as Record<string, unknown>[];
  return Promise.all(
    rows.map(async (r) => {
      const rawTask = r.task as Record<string, unknown> | Record<string, unknown>[];
      const task = (Array.isArray(rawTask) ? rawTask[0] : rawTask) ?? {};
      const parts = (r.participants as Record<string, unknown>[]) ?? [];
      return {
        id: r.id as string,
        status: r.status as "pending" | "approved" | "rejected",
        taskId: r.task_id as string,
        taskTitle: (task.title as string) ?? "Extra job",
        taskIcon: (task.icon as string) ?? "tidy",
        reward: (task.reward as number) ?? 0,
        submittedBy: r.submitted_by as string,
        submittedAt: r.submitted_at as string,
        reviewedAt: (r.reviewed_at as string | null) ?? null,
        adminNote: (r.admin_note as string | null) ?? null,
        beforeUrl: await signedUrl(r.before_path as string),
        afterUrl: await signedUrl(r.after_path as string),
        participants: parts.map((p) => {
          const raw = p.student as Record<string, unknown> | Record<string, unknown>[];
          const s = (Array.isArray(raw) ? raw[0] : raw) ?? {};
          return {
            id: p.student_id as string,
            name: (s.display_name as string) ?? "?",
            color: (s.color as string) ?? "#4A90D0",
            amount: (p.amount as number | null) ?? null,
          };
        }),
      };
    }),
  );
}

// ── Admin ────────────────────────────────────────────────────────────────────

export async function getAdminExtraCredsTasks(): Promise<ExtraCredsTask[]> {
  const admin = await requireAdmin();
  if (!admin) return [];
  const service = createServiceClient();
  const { data } = await service
    .from("extra_creds_tasks")
    .select(TASK_COLS)
    .eq("household_id", admin.householdId)
    .order("sort_order")
    .order("created_at");
  return (data ?? []).map((r) => mapTask(r as Record<string, unknown>));
}

export async function getPendingExtraClaims(): Promise<ExtraCredsClaim[]> {
  const admin = await requireAdmin();
  if (!admin) return [];
  return loadClaims(admin.householdId, ["pending"]);
}

export async function getExtraClaimHistory(): Promise<ExtraCredsClaim[]> {
  const admin = await requireAdmin();
  if (!admin) return [];
  return loadClaims(admin.householdId, ["approved", "rejected"], 60);
}

export async function saveExtraCredsTask(input: {
  id?: string;
  title: string;
  description: string;
  icon: string;
  reward: number;
  shareable: boolean;
  repeatRule: RepeatRule;
  isActive: boolean;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Admins only" };
  const title = input.title.trim();
  if (!title) return { success: false, error: "Give the job a name" };
  const reward = Math.floor(Number(input.reward));
  if (!Number.isFinite(reward) || reward < 1 || reward > 100000)
    return { success: false, error: "Reward must be 1 or more" };
  if (!["once", "daily", "weekly", "unlimited"].includes(input.repeatRule))
    return { success: false, error: "Bad repeat rule" };

  const service = createServiceClient();
  const row = {
    household_id: admin.householdId,
    title,
    description: input.description.trim(),
    icon: input.icon || "tidy",
    reward,
    shareable: input.shareable,
    repeat_rule: input.repeatRule,
    is_active: input.isActive,
  };
  if (input.id) {
    const { error } = await service
      .from("extra_creds_tasks")
      .update(row)
      .eq("id", input.id)
      .eq("household_id", admin.householdId);
    if (error) return { success: false, error: error.message };
    return { success: true, id: input.id };
  }
  const { data, error } = await service.from("extra_creds_tasks").insert(row).select("id").single();
  if (error || !data) return { success: false, error: error?.message ?? "Could not save" };
  return { success: true, id: data.id as string };
}

/** Delete a job, or just hide it if it already has claims (keeps history intact). */
export async function deleteExtraCredsTask(
  id: string,
): Promise<{ success: boolean; error?: string; hidden?: boolean }> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Admins only" };
  const service = createServiceClient();
  const { data: claims } = await service.from("extra_creds_claims").select("id").eq("task_id", id).limit(1);
  if (claims && claims.length > 0) {
    const { error } = await service
      .from("extra_creds_tasks")
      .update({ is_active: false })
      .eq("id", id)
      .eq("household_id", admin.householdId);
    if (error) return { success: false, error: error.message };
    return { success: true, hidden: true };
  }
  const { error } = await service.from("extra_creds_tasks").delete().eq("id", id).eq("household_id", admin.householdId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Approve a claim. `amounts` is each participant's final Creds (default = equal split, admin may override). */
export async function approveExtraClaim(
  claimId: string,
  amounts: Record<string, number>,
  adminNote?: string,
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Admins only" };
  const service = createServiceClient();

  const { data: claim } = await service
    .from("extra_creds_claims")
    .select(
      "id, status, household_id, task:extra_creds_tasks(title), participants:extra_creds_participants(student_id)",
    )
    .eq("id", claimId)
    .eq("household_id", admin.householdId)
    .single();
  if (!claim) return { success: false, error: "Claim not found" };
  if (claim.status !== "pending") return { success: false, error: "Already reviewed" };

  const participantIds = ((claim.participants as { student_id: string }[]) ?? []).map((p) => p.student_id);
  for (const id of participantIds) {
    const v = amounts[id];
    if (!Number.isInteger(v) || v < 0 || v > 100000) return { success: false, error: "Amounts must be whole numbers" };
  }
  const rawTask = claim.task as { title: string } | { title: string }[];
  const title = (Array.isArray(rawTask) ? rawTask[0] : rawTask)?.title ?? "Extra job";

  // Lock the claim first so a double-tap can't pay twice.
  const { data: locked } = await service
    .from("extra_creds_claims")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), admin_note: adminNote?.trim() || null })
    .eq("id", claimId)
    .eq("status", "pending")
    .select("id");
  if (!locked || locked.length === 0) return { success: false, error: "Already reviewed" };

  const rows = participantIds
    .filter((id) => amounts[id] > 0)
    .map((id) => ({
      student_id: id,
      category: "extra_creds",
      source_id: claimId,
      points: amounts[id],
      note: `Extra Creds: ${title}`,
    }));
  if (rows.length > 0) {
    const { error } = await service.from("points_log").insert(rows);
    if (error) {
      await service.from("extra_creds_claims").update({ status: "pending", reviewed_at: null }).eq("id", claimId);
      return { success: false, error: error.message };
    }
  }
  for (const id of participantIds) {
    await service
      .from("extra_creds_participants")
      .update({ amount: amounts[id] })
      .eq("claim_id", claimId)
      .eq("student_id", id);
  }
  return { success: true };
}

export async function rejectExtraClaim(
  claimId: string,
  adminNote?: string,
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Admins only" };
  const service = createServiceClient();
  const { data, error } = await service
    .from("extra_creds_claims")
    .update({ status: "rejected", reviewed_at: new Date().toISOString(), admin_note: adminNote?.trim() || null })
    .eq("id", claimId)
    .eq("household_id", admin.householdId)
    .eq("status", "pending")
    .select("id");
  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) return { success: false, error: "Already reviewed" };
  return { success: true };
}

export async function countPendingExtraClaims(): Promise<number> {
  const admin = await requireAdmin();
  if (!admin) return 0;
  const service = createServiceClient();
  const { count } = await service
    .from("extra_creds_claims")
    .select("id", { count: "exact", head: true })
    .eq("household_id", admin.householdId)
    .eq("status", "pending");
  return count ?? 0;
}

// ── Student ──────────────────────────────────────────────────────────────────

export interface ExtraCredsBoard {
  studentKey: string;
  me: ExtraCredsPerson;
  siblings: ExtraCredsPerson[];
  tasks: (ExtraCredsTask & { state: TaskState; withNames: string[] })[];
  recent: ExtraCredsClaim[];
}

export async function getExtraCredsBoard(): Promise<ExtraCredsBoard | null> {
  const me = await requireStudent();
  if (!me) return null;
  const service = createServiceClient();

  const [{ data: tasks }, { data: people }, { data: mine }] = await Promise.all([
    service
      .from("extra_creds_tasks")
      .select(TASK_COLS)
      .eq("household_id", me.householdId)
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at"),
    service.from("profiles").select("id, display_name, color").eq("household_id", me.householdId).eq("role", "student"),
    service
      .from("extra_creds_participants")
      .select("claim_id, claim:extra_creds_claims(id, task_id, status, claim_date, week_start)")
      .eq("student_id", me.userId),
  ]);

  const persons: ExtraCredsPerson[] = (people ?? []).map((p) => ({
    id: p.id as string,
    name: p.display_name as string,
    color: (p.color as string) ?? "#4A90D0",
  }));
  const self = persons.find((p) => p.id === me.userId) ?? { id: me.userId, name: "You", color: "#4A90D0" };

  type MyClaim = { id: string; task_id: string; status: string; claim_date: string; week_start: string };
  const myClaims: MyClaim[] = (mine ?? [])
    .map((m) => {
      const raw = (m as Record<string, unknown>).claim as MyClaim | MyClaim[] | null;
      return Array.isArray(raw) ? raw[0] : raw;
    })
    .filter((c): c is MyClaim => !!c && c.status !== "rejected");

  // Who else is on my pending claims (for "with Rowan")
  const pendingIds = myClaims.filter((c) => c.status === "pending").map((c) => c.id);
  const withByClaim: Record<string, string[]> = {};
  if (pendingIds.length > 0) {
    const { data: others } = await service
      .from("extra_creds_participants")
      .select("claim_id, student_id")
      .in("claim_id", pendingIds);
    for (const o of others ?? []) {
      if (o.student_id === me.userId) continue;
      const name = persons.find((p) => p.id === o.student_id)?.name;
      if (!name) continue;
      withByClaim[o.claim_id as string] = [...(withByClaim[o.claim_id as string] ?? []), name];
    }
  }

  const today = todayLocal();
  const week = weekMonday();
  const withState = (tasks ?? []).map((raw) => {
    const t = mapTask(raw as Record<string, unknown>);
    const forTask = myClaims.filter((c) => c.task_id === t.id);
    const pendingClaim = forTask.find((c) => c.status === "pending");
    let state: TaskState = "available";
    if (pendingClaim) state = "pending";
    else if (t.repeatRule === "once" && forTask.length > 0) state = "done";
    else if (t.repeatRule === "daily" && forTask.some((c) => c.claim_date === today)) state = "done";
    else if (t.repeatRule === "weekly" && forTask.some((c) => c.week_start === week)) state = "done";
    return { ...t, state, withNames: pendingClaim ? (withByClaim[pendingClaim.id] ?? []) : [] };
  });

  const recentAll = await loadClaims(me.householdId, ["approved", "rejected"], 40);
  const recent = recentAll.filter((c) => c.participants.some((p) => p.id === me.userId)).slice(0, 8);

  return {
    studentKey: me.studentKey,
    me: self,
    siblings: persons.filter((p) => p.id !== me.userId),
    tasks: withState,
    recent,
  };
}

/** Student submits a claim. Photos are already uploaded to the private bucket by the browser. */
export async function submitExtraCredsClaim(input: {
  taskId: string;
  beforePath: string;
  afterPath: string;
  withIds: string[];
}): Promise<{ success: boolean; error?: string }> {
  const me = await requireStudent();
  if (!me) return { success: false, error: "Not signed in as a student" };
  const service = createServiceClient();

  const prefix = `${me.studentKey}/extra-creds/`;
  if (!input.beforePath.startsWith(prefix) || !input.afterPath.startsWith(prefix)) {
    return { success: false, error: "Photo upload looks wrong — try again" };
  }

  const { data: taskRow } = await service
    .from("extra_creds_tasks")
    .select(TASK_COLS)
    .eq("id", input.taskId)
    .eq("household_id", me.householdId)
    .eq("is_active", true)
    .single();
  if (!taskRow) return { success: false, error: "That job isn't available" };
  const task = mapTask(taskRow as Record<string, unknown>);

  const withIds = Array.from(new Set(input.withIds.filter((id) => id !== me.userId)));
  if (withIds.length > 0 && !task.shareable) return { success: false, error: "This job is a solo job" };
  if (withIds.length > 0) {
    const { data: valid } = await service
      .from("profiles")
      .select("id")
      .in("id", withIds)
      .eq("household_id", me.householdId)
      .eq("role", "student");
    if ((valid ?? []).length !== withIds.length) return { success: false, error: "Unknown helper" };
  }
  const everyone = [me.userId, ...withIds];

  // Everyone on the claim must be eligible under the repeat rule.
  const { data: existing } = await service
    .from("extra_creds_participants")
    .select("student_id, claim:extra_creds_claims!inner(task_id, status, claim_date, week_start)")
    .in("student_id", everyone);
  const today = todayLocal();
  const week = weekMonday();
  for (const row of existing ?? []) {
    const raw = (row as Record<string, unknown>).claim as Record<string, unknown> | Record<string, unknown>[];
    const c = Array.isArray(raw) ? raw[0] : raw;
    if (!c || c.task_id !== task.id || c.status === "rejected") continue;
    const blocked =
      c.status === "pending" ||
      task.repeatRule === "once" ||
      (task.repeatRule === "daily" && c.claim_date === today) ||
      (task.repeatRule === "weekly" && c.week_start === week);
    if (blocked) return { success: false, error: "Already claimed — waiting on review or done for now" };
  }

  const { data: claim, error } = await service
    .from("extra_creds_claims")
    .insert({
      task_id: task.id,
      household_id: me.householdId,
      submitted_by: me.userId,
      before_path: input.beforePath,
      after_path: input.afterPath,
      claim_date: today,
      week_start: week,
    })
    .select("id")
    .single();
  if (error || !claim) return { success: false, error: error?.message ?? "Could not submit" };

  const { error: pErr } = await service
    .from("extra_creds_participants")
    .insert(everyone.map((student_id) => ({ claim_id: claim.id, student_id })));
  if (pErr) {
    await service.from("extra_creds_claims").delete().eq("id", claim.id);
    return { success: false, error: pErr.message };
  }
  return { success: true };
}
