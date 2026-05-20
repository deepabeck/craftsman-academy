"use server";

import { revalidatePath } from "next/cache";
import { getAdminHouseholdId } from "@/lib/get-admin-household";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export interface ProfileUpdateData {
  id: string;
  displayName: string;
  tagline: string;
  // avatarUrl intentionally omitted — use updateAvatarUrl() for photo saves.
  // Passing avatarUrl through updateProfile risks persisting blob: preview URLs to the DB.
  // Note: color is intentionally omitted — students manage their own accent color via Customize
  // Note: grade is intentionally omitted — grade is derived from school_years table, not stored on profiles
}

export async function updateProfile(data: ProfileUpdateData): Promise<{ error?: string }> {
  try {
    // Use service client so admins can update student profiles regardless of RLS edge cases
    const service = createServiceClient();

    const { error } = await service
      .from("profiles")
      .update({
        display_name: data.displayName,
        tagline: data.tagline,
        // avatar_url deliberately excluded — use updateAvatarUrl() instead
      })
      .eq("id", data.id);

    if (error) return { error: error.message };

    revalidatePath("/admin/profiles");
    revalidatePath("/admin/dashboard");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save profile" };
  }
}

/** Save the household's iCal calendar feed URL. */
export async function saveHouseholdIcalUrl(url: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const householdId = await getAdminHouseholdId();
  if (!householdId) return { error: "No household found" };

  const { error } = await supabase
    .from("households")
    .update({ ical_url: url || null })
    .eq("id", householdId);

  if (error) return { error: error.message };
  revalidatePath("/admin/lessons");
  revalidatePath("/student/today");
  return {};
}

/** Update a student's login email via the Supabase admin API (service role only). */
export async function setStudentEmail(userId: string, email: string): Promise<{ error?: string }> {
  if (!email.includes("@")) return { error: "Invalid email address." };
  const service = createServiceClient();
  const { error } = await service.auth.admin.updateUserById(userId, { email });
  if (error) return { error: error.message };
  return {};
}

/**
 * Set a student's password via the Supabase admin API (service role only).
 */
export async function setStudentPassword(userId: string, password: string): Promise<{ error?: string }> {
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  const service = createServiceClient();
  const { error } = await service.auth.admin.updateUserById(userId, { password });
  if (error) return { error: error.message };
  return {};
}

/**
 * Change the currently logged-in admin's own password.
 */
export async function changeOwnPassword(password: string): Promise<{ error?: string }> {
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return {};
}

/**
 * Save a new avatar URL to the profiles table using the service role client (bypasses RLS).
 */
export async function updateAvatarUrl(userId: string, url: string): Promise<{ error?: string }> {
  const service = createServiceClient();
  const { error } = await service.from("profiles").update({ avatar_url: url }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/admin/profiles");
  revalidatePath("/admin/dashboard");
  return {};
}

/**
 * Upload an avatar image server-side using the service role client (bypasses RLS).
 * Returns the public URL of the uploaded file.
 */
export async function uploadAvatar(formData: FormData): Promise<{ url?: string; error?: string }> {
  try {
    const file = formData.get("file") as File | null;
    const studentKey = formData.get("studentKey") as string | null;

    if (!file || !studentKey) return { error: "Missing file or student key" };
    if (file.size === 0) return { error: "File is empty" };
    if (file.size > 5 * 1024 * 1024) return { error: "File too large — max 5 MB" };

    // Determine content type — fall back to extension-based detection if browser doesn't set it
    const rawType = file.type;
    const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase();
    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      heic: "image/jpeg", // re-encode HEIC as jpeg on upload
    };
    const contentType = rawType && rawType !== "application/octet-stream" ? rawType : (mimeMap[ext] ?? "image/jpeg");
    const storageExt = ext === "heic" ? "jpg" : ext;
    const path = `${studentKey}.${storageExt}`;

    // Convert File to ArrayBuffer for Node.js server action environment
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    if (buffer.length === 0) return { error: "Could not read file contents" };

    const service = createServiceClient();

    // Upsert: upload and overwrite if file already exists
    const { error: uploadError } = await service.storage.from("avatars").upload(path, buffer, {
      contentType,
      upsert: true,
    });

    if (uploadError) return { error: uploadError.message };

    // Get the public URL (bucket is public so no signing needed)
    // Append cache-bust so browsers don't serve a stale version after re-upload
    const { data } = service.storage.from("avatars").getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;

    return { url };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unexpected upload error" };
  }
}
