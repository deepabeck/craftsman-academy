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
}

export interface MarketplacePurchase {
  id: string;
  itemId: string;
  status: "pending" | "approved" | "rejected";
  weekStart: string;
  requestedAt: string;
  reviewedAt: string | null;
  adminNote: string | null;
  item: MarketplaceItem;
  student: { id: string; name: string; color: string; avatarUrl: string | null };
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
    .select("id, name, description, price, emoji, weekly_limit, sort_order")
    .eq("is_active", true)
    .order("price");
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    price: r.price,
    emoji: r.emoji,
    weeklyLimit: r.weekly_limit,
    sortOrder: r.sort_order,
  }));
}

/** Student's purchases for the current week. */
export async function getMyWeeklyPurchases(): Promise<{ itemId: string; status: string }[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const weekStart = currentWeekStart();
  const { data } = await supabase
    .from("marketplace_purchases")
    .select("item_id, status")
    .eq("student_id", user.id)
    .eq("week_start", weekStart)
    .neq("status", "rejected");
  return (data ?? []).map((r) => ({ itemId: r.item_id, status: r.status }));
}

/** Student requests a marketplace item. */
export async function requestPurchase(itemId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const weekStart = currentWeekStart();

  // Check weekly limit
  const { data: existing } = await supabase
    .from("marketplace_purchases")
    .select("id")
    .eq("student_id", user.id)
    .eq("item_id", itemId)
    .eq("week_start", weekStart)
    .neq("status", "rejected");

  if (existing && existing.length > 0) return { success: false, error: "Already requested this week" };

  // Check balance
  const service = createServiceClient();
  const { data: logs } = await service.from("points_log").select("points").eq("student_id", user.id);
  const balance = (logs ?? []).reduce((s: number, r: { points: number }) => s + r.points, 0);

  const { data: item } = await supabase.from("marketplace_items").select("price").eq("id", itemId).single();
  if (!item) return { success: false, error: "Item not found" };
  if (balance < item.price) return { success: false, error: "Not enough Cogs" };

  const { error } = await supabase.from("marketplace_purchases").insert({
    student_id: user.id,
    item_id: itemId,
    week_start: weekStart,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Admin: get all pending purchase requests. */
export async function getPendingPurchases(): Promise<MarketplacePurchase[]> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("marketplace_purchases")
    .select(`
      id, item_id, status, week_start, requested_at, reviewed_at, admin_note,
      item:marketplace_items(id, name, description, price, emoji, weekly_limit, sort_order),
      student:profiles(id, display_name, color, avatar_url)
    `)
    .eq("status", "pending")
    .order("requested_at", { ascending: false });
  if (error || !data) return [];
  return data.map(mapPurchase);
}

/** Admin: get all purchases (full history). */
export async function getAllPurchases(): Promise<MarketplacePurchase[]> {
  const service = createServiceClient();
  const { data, error } = await service
    .from("marketplace_purchases")
    .select(`
      id, item_id, status, week_start, requested_at, reviewed_at, admin_note,
      item:marketplace_items(id, name, description, price, emoji, weekly_limit, sort_order),
      student:profiles(id, display_name, color, avatar_url)
    `)
    .order("requested_at", { ascending: false });
  if (error || !data) return [];
  return data.map(mapPurchase);
}

function mapPurchase(r: Record<string, unknown>): MarketplacePurchase {
  const item = r.item as Record<string, unknown>;
  const student = r.student as Record<string, unknown>;
  return {
    id: r.id as string,
    itemId: r.item_id as string,
    status: r.status as "pending" | "approved" | "rejected",
    weekStart: r.week_start as string,
    requestedAt: r.requested_at as string,
    reviewedAt: (r.reviewed_at as string | null) ?? null,
    adminNote: (r.admin_note as string | null) ?? null,
    item: {
      id: item.id as string,
      name: item.name as string,
      description: item.description as string,
      price: item.price as number,
      emoji: item.emoji as string,
      weeklyLimit: item.weekly_limit as number,
      sortOrder: item.sort_order as number,
    },
    student: {
      id: student.id as string,
      name: student.display_name as string,
      color: student.color as string,
      avatarUrl: (student.avatar_url as string | null) ?? null,
    },
  };
}

/** Admin: approve a purchase — deducts COGS via points_log. */
export async function approvePurchase(
  purchaseId: string,
  adminNote?: string,
): Promise<{ success: boolean; error?: string }> {
  const service = createServiceClient();

  const { data: purchase } = await service
    .from("marketplace_purchases")
    .select("student_id, item_id, item:marketplace_items(name, price)")
    .eq("id", purchaseId)
    .single();
  if (!purchase) return { success: false, error: "Purchase not found" };

  const rawItem = purchase.item as unknown;
  const item = (Array.isArray(rawItem) ? rawItem[0] : rawItem) as { name: string; price: number };

  // Deduct COGS
  const { error: pointsErr } = await service.from("points_log").insert({
    student_id: purchase.student_id,
    category: "purchase",
    source_id: purchaseId,
    points: -item.price,
    note: `Redeemed: ${item.name}`,
  });
  if (pointsErr) return { success: false, error: pointsErr.message };

  // Update status
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

/** Admin: reject a purchase — no COGS deducted. */
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
    const subj = (Array.isArray(r.subject) ? r.subject[0] : r.subject) as {
      name: string;
      icon: string;
    };
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

  // Cancel the task
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
  const { data } = await service
    .from("marketplace_items")
    .select("id, name, description, price, emoji, is_active, weekly_limit, sort_order")
    .order("sort_order");
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    price: r.price,
    emoji: r.emoji,
    isActive: r.is_active,
    weeklyLimit: r.weekly_limit,
    sortOrder: r.sort_order,
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
}): Promise<{ success: boolean; error?: string }> {
  const service = createServiceClient();
  const id =
    item.id ??
    item.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  const { error } = await service.from("marketplace_items").upsert({
    id,
    name: item.name,
    description: item.description,
    price: item.price,
    emoji: item.emoji,
    weekly_limit: item.weeklyLimit,
    is_active: item.isActive,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Admin: delete a marketplace item (only if no purchases reference it). */
export async function deleteMarketplaceItem(id: string): Promise<{ success: boolean; error?: string }> {
  const service = createServiceClient();
  // Check for any purchases first
  const { data: purchases } = await service.from("marketplace_purchases").select("id").eq("item_id", id).limit(1);
  if (purchases && purchases.length > 0) {
    // Soft-delete: just deactivate it
    const { error } = await service.from("marketplace_items").update({ is_active: false }).eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }
  const { error } = await service.from("marketplace_items").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
