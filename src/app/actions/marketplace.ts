"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  weeklyLimit: number;
  sortOrder: number;
  shared: boolean;
}

export interface MarketplacePurchase {
  id: string;
  itemId: string;
  status: "pending" | "approved" | "rejected";
  weekStart: string;
  requestedAt: string;
  reviewedAt: string | null;
  adminNote: string | null;
  note: string | null;
  contributionAmount: number | null;
  item: MarketplaceItem;
  student: { id: string; name: string; color: string; avatarUrl: string | null };
}

export interface SharedContribution {
  itemId: string;
  studentId: string;
  studentName: string;
  studentColor: string;
  status: string;
  note: string | null;
}

function currentWeekStart(): string {
  const APP_TZ = process.env.APP_TIMEZONE ?? "America/Denver";
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: APP_TZ }));
  const dow = today.getDay();
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysSinceMonday);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

/** All active marketplace items. */
export async function getMarketplaceItems(): Promise<MarketplaceItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("marketplace_items")
    .select("id, name, description, price, emoji, weekly_limit, sort_order, shared")
    .eq("is_active", true)
    .order("price");

  if (error || !data) {
    // Fallback without shared column
    const { data: fallback } = await supabase
      .from("marketplace_items")
      .select("id, name, description, price, emoji, weekly_limit, sort_order")
      .eq("is_active", true)
      .order("price");
    return (fallback ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      price: r.price,
      emoji: r.emoji,
      weeklyLimit: r.weekly_limit,
      sortOrder: r.sort_order,
      shared: false,
    }));
  }

  return data.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    price: r.price,
    emoji: r.emoji,
    weeklyLimit: r.weekly_limit,
    sortOrder: r.sort_order,
    shared: r.shared ?? false,
  }));
}

/** Student's purchases for the current week. */
export async function getMyWeeklyPurchases(): Promise<{ itemId: string; status: string; note: string | null }[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const weekStart = currentWeekStart();
  const { data } = await supabase
    .from("marketplace_purchases")
    .select("item_id, status, note")
    .eq("student_id", user.id)
    .eq("week_start", weekStart)
    .neq("status", "rejected");
  return (data ?? []).map((r) => ({ itemId: r.item_id, status: r.status, note: r.note ?? null }));
}

/** All this-week contributions to shared items (used to show co-contributor status). */
export async function getSharedItemContributions(): Promise<SharedContribution[]> {
  const service = createServiceClient();
  const weekStart = currentWeekStart();

  const { data: sharedItems } = await service
    .from("marketplace_items")
    .select("id")
    .eq("shared", true)
    .eq("is_active", true);

  const sharedIds = (sharedItems ?? []).map((i: { id: string }) => i.id);
  if (sharedIds.length === 0) return [];

  const { data } = await service
    .from("marketplace_purchases")
    .select("item_id, status, student_id, note, student:profiles(display_name, color)")
    .in("item_id", sharedIds)
    .eq("week_start", weekStart)
    .neq("status", "rejected");

  return (data ?? []).map((r: Record<string, unknown>) => {
    const student = r.student as Record<string, unknown>;
    return {
      itemId: r.item_id as string,
      studentId: r.student_id as string,
      studentName: (student?.display_name as string) ?? "?",
      studentColor: (student?.color as string) ?? "#4A90D0",
      status: r.status as string,
      note: (r.note as string | null) ?? null,
    };
  });
}

/** Student requests a marketplace item. Shared items charge price ÷ 2 per student. */
export async function requestPurchase(itemId: string, note?: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const weekStart = currentWeekStart();

  // Already requested this week?
  const { data: existing } = await supabase
    .from("marketplace_purchases")
    .select("id")
    .eq("student_id", user.id)
    .eq("item_id", itemId)
    .eq("week_start", weekStart)
    .neq("status", "rejected");
  if (existing && existing.length > 0) return { success: false, error: "Already requested this week" };

  // Fetch item
  const { data: item } = await supabase.from("marketplace_items").select("price, shared").eq("id", itemId).single();
  if (!item) return { success: false, error: "Item not found" };

  // Shared items cost half each; solo items cost full price
  const contributionAmount = item.shared ? Math.ceil(item.price / 2) : item.price;

  // Check balance
  const service = createServiceClient();
  const { data: logs } = await service.from("points_log").select("points").eq("student_id", user.id);
  const balance = (logs ?? []).reduce((s: number, r: { points: number }) => s + r.points, 0);
  if (balance < contributionAmount) return { success: false, error: "Not enough Cogs" };

  const { error } = await supabase.from("marketplace_purchases").insert({
    student_id: user.id,
    item_id: itemId,
    week_start: weekStart,
    note: note?.trim() || null,
    contribution_amount: contributionAmount,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Admin: all pending purchase requests. */
export async function getPendingPurchases(): Promise<MarketplacePurchase[]> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("marketplace_purchases")
    .select(`
      id, item_id, status, week_start, requested_at, reviewed_at, admin_note, note, contribution_amount,
      item:marketplace_items(id, name, description, price, emoji, weekly_limit, sort_order, shared),
      student:profiles(id, display_name, color, avatar_url)
    `)
    .eq("status", "pending")
    .order("requested_at", { ascending: true });
  if (error || !data) return [];
  return data.map(mapPurchase);
}

/** Admin: all purchases (full history). */
export async function getAllPurchases(): Promise<MarketplacePurchase[]> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("marketplace_purchases")
    .select(`
      id, item_id, status, week_start, requested_at, reviewed_at, admin_note, note, contribution_amount,
      item:marketplace_items(id, name, description, price, emoji, weekly_limit, sort_order, shared),
      student:profiles(id, display_name, color, avatar_url)
    `)
    .order("requested_at", { ascending: false });
  if (error || !data) return [];
  return data.map(mapPurchase);
}

function mapPurchase(r: Record<string, unknown>): MarketplacePurchase {
  const rawItem = r.item as Record<string, unknown> | Record<string, unknown>[];
  const itemData = Array.isArray(rawItem) ? rawItem[0] : rawItem;
  const student = r.student as Record<string, unknown>;
  return {
    id: r.id as string,
    itemId: r.item_id as string,
    status: r.status as "pending" | "approved" | "rejected",
    weekStart: r.week_start as string,
    requestedAt: r.requested_at as string,
    reviewedAt: (r.reviewed_at as string | null) ?? null,
    adminNote: (r.admin_note as string | null) ?? null,
    note: (r.note as string | null) ?? null,
    contributionAmount: (r.contribution_amount as number | null) ?? null,
    item: {
      id: itemData.id as string,
      name: itemData.name as string,
      description: itemData.description as string,
      price: itemData.price as number,
      emoji: itemData.emoji as string,
      weeklyLimit: itemData.weekly_limit as number,
      sortOrder: itemData.sort_order as number,
      shared: (itemData.shared as boolean) ?? false,
    },
    student: {
      id: student.id as string,
      name: student.display_name as string,
      color: student.color as string,
      avatarUrl: (student.avatar_url as string | null) ?? null,
    },
  };
}

/** Admin: approve a purchase — deducts contribution_amount (or item.price for legacy rows). */
export async function approvePurchase(
  purchaseId: string,
  adminNote?: string,
): Promise<{ success: boolean; error?: string }> {
  const service = createServiceClient();

  const { data: purchase } = await service
    .from("marketplace_purchases")
    .select("student_id, item_id, contribution_amount, item:marketplace_items(name, price)")
    .eq("id", purchaseId)
    .single();
  if (!purchase) return { success: false, error: "Purchase not found" };

  const rawItem = purchase.item as unknown;
  const item = (Array.isArray(rawItem) ? rawItem[0] : rawItem) as { name: string; price: number };

  // Use contribution_amount for shared items; fall back to full price for legacy rows
  const deductAmount = (purchase.contribution_amount as number | null) ?? item.price;

  const { error: pointsErr } = await service.from("points_log").insert({
    student_id: purchase.student_id,
    category: "purchase",
    source_id: purchaseId,
    points: -deductAmount,
    note: `Redeemed: ${item.name}`,
  });
  if (pointsErr) return { success: false, error: pointsErr.message };

  const { error } = await service
    .from("marketplace_purchases")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      admin_note: adminNote ?? null,
    })
    .eq("id", purchaseId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Admin: approve all purchases in a shared group (deducts each student's share). */
export async function approveSharedGroup(
  purchaseIds: string[],
  adminNote?: string,
): Promise<{ success: boolean; error?: string }> {
  const results = await Promise.all(purchaseIds.map((id) => approvePurchase(id, adminNote)));
  const failed = results.find((r) => !r.success);
  if (failed) return { success: false, error: failed.error ?? "Some approvals failed" };
  return { success: true };
}

/** Admin: reject a purchase — no Cogs deducted. */
export async function rejectPurchase(
  purchaseId: string,
  adminNote?: string,
): Promise<{ success: boolean; error?: string }> {
  const service = createServiceClient();
  const { error } = await service
    .from("marketplace_purchases")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      admin_note: adminNote ?? null,
    })
    .eq("id", purchaseId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Admin: reject all purchases in a shared group. */
export async function rejectSharedGroup(
  purchaseIds: string[],
  adminNote?: string,
): Promise<{ success: boolean; error?: string }> {
  const results = await Promise.all(purchaseIds.map((id) => rejectPurchase(id, adminNote)));
  if (results.some((r) => !r.success)) return { success: false, error: "Some rejections failed" };
  return { success: true };
}

// ── Skip task / day helpers ──────────────────────────────────────────────────

export interface SkippableTask {
  id: string;
  date: string;
  subjectName: string;
  subjectIcon: string;
}

/** Admin: get a student's pending (and missed) tasks for the next 14 days. */
export async function getStudentSkippableTasks(studentId: string): Promise<SkippableTask[]> {
  const service = createServiceClient();
  const APP_TZ = process.env.APP_TIMEZONE ?? "America/Denver";
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: APP_TZ }));
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const end = new Date(today);
  end.setDate(today.getDate() + 14);

  const { data } = await service
    .from("tasks")
    .select("id, task_date, subject:subjects(name, icon)")
    .eq("student_id", studentId)
    .in("status", ["pending", "missed"])
    .gte("task_date", fmt(today))
    .lte("task_date", fmt(end))
    .order("task_date");

  return (data ?? []).map((r) => {
    const subj = (Array.isArray(r.subject) ? r.subject[0] : r.subject) as { name: string; icon: string };
    return {
      id: r.id,
      date: r.task_date,
      subjectName: subj?.name ?? "Task",
      subjectIcon: subj?.icon ?? "today",
    };
  });
}

/** Admin: skip one task and approve the purchase atomically. */
export async function skipTaskAndApprove(
  taskId: string,
  purchaseId: string,
  adminNote?: string,
): Promise<{ success: boolean; error?: string }> {
  const service = createServiceClient();
  const { error: taskErr } = await service
    .from("tasks")
    .update({ status: "cancelled", cancelled_reason: "⚡ Skipped — marketplace reward" })
    .eq("id", taskId);
  if (taskErr) return { success: false, error: taskErr.message };
  return approvePurchase(purchaseId, adminNote);
}

/** Admin: skip all pending tasks for a given date and approve the purchase. */
export async function skipDayAndApprove(
  studentId: string,
  date: string,
  purchaseId: string,
  adminNote?: string,
): Promise<{ success: boolean; error?: string }> {
  const service = createServiceClient();
  const { error: taskErr } = await service
    .from("tasks")
    .update({ status: "cancelled", cancelled_reason: "⚡ Day off — marketplace reward" })
    .eq("student_id", studentId)
    .eq("task_date", date)
    .in("status", ["pending", "missed"]);
  if (taskErr) return { success: false, error: taskErr.message };
  return approvePurchase(purchaseId, adminNote);
}

/** Admin: all marketplace items (including inactive). */
export async function getAllMarketplaceItems(): Promise<(MarketplaceItem & { isActive: boolean })[]> {
  const service = createServiceClient();
  // Try with shared column; fall back gracefully if migration hasn't run yet
  const { data, error } = await service
    .from("marketplace_items")
    .select("id, name, description, price, emoji, is_active, weekly_limit, sort_order, shared")
    .order("price");

  if (error || !data) {
    // Fallback: fetch without shared (pre-migration)
    const { data: fallback } = await service
      .from("marketplace_items")
      .select("id, name, description, price, emoji, is_active, weekly_limit, sort_order")
      .order("price");
    return (fallback ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      price: r.price,
      emoji: r.emoji,
      isActive: r.is_active,
      weeklyLimit: r.weekly_limit,
      sortOrder: r.sort_order,
      shared: false,
    }));
  }

  return data.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    price: r.price,
    emoji: r.emoji,
    isActive: r.is_active,
    weeklyLimit: r.weekly_limit,
    sortOrder: r.sort_order,
    shared: r.shared ?? false,
  }));
}

/** Admin: save (create or update) a marketplace item. */
export async function upsertMarketplaceItem(item: {
  id?: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  weeklyLimit: number;
  isActive: boolean;
  shared: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const { getAdminHouseholdId } = await import("@/lib/get-admin-household");
  const householdId = await getAdminHouseholdId();
  if (!householdId) return { success: false, error: "No household found — are you logged in as admin?" };

  const service = createServiceClient();
  const id =
    item.id ??
    item.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  const { error } = await service.from("marketplace_items").upsert({
    id,
    household_id: householdId,
    name: item.name,
    description: item.description,
    price: item.price,
    emoji: item.emoji,
    weekly_limit: item.weeklyLimit,
    is_active: item.isActive,
    shared: item.shared,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Admin: delete a marketplace item (soft-deactivates if purchases exist). */
export async function deleteMarketplaceItem(id: string): Promise<{ success: boolean; error?: string }> {
  const service = createServiceClient();
  const { data: purchases } = await service.from("marketplace_purchases").select("id").eq("item_id", id).limit(1);
  if (purchases && purchases.length > 0) {
    const { error } = await service.from("marketplace_items").update({ is_active: false }).eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }
  const { error } = await service.from("marketplace_items").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
