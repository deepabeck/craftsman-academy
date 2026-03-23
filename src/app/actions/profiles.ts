"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export interface ProfileUpdateData {
  id: string;
  displayName: string;
  tagline: string;
  avatarUrl?: string | null;
  // Note: color is intentionally omitted — students manage their own accent color via Customize
  // Note: grade is intentionally omitted — grade is derived from school_years table, not stored on profiles
}

export async function updateProfile(data: ProfileUpdateData): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: data.displayName,
      tagline: data.tagline,
      ...(data.avatarUrl !== undefined ? { avatar_url: data.avatarUrl } : {}),
    })
    .eq("id", data.id);

  if (error) return { error: error.message };

  revalidatePath("/admin/profiles");
  revalidatePath("/admin/dashboard");
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
 * Upload an avatar image server-side using the service role client (bypasses RLS).
 * Returns the public URL of the uploaded file.
 */
export async function uploadAvatar(formData: FormData): Promise<{ url?: string; error?: string }> {
  const file = formData.get("file") as File | null;
  const studentKey = formData.get("studentKey") as string | null;

  if (!file || !studentKey) return { error: "Missing file or student key" };

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${studentKey}.${ext}`;

  // Convert File to ArrayBuffer → Uint8Array for Node.js upload
  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const service = createServiceClient();

  // Upsert: upload and overwrite if file already exists
  const { error: uploadError } = await service.storage.from("avatars").upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (uploadError) return { error: uploadError.message };

  // Get the public URL (bucket is public so no signing needed)
  const { data } = service.storage.from("avatars").getPublicUrl(path);

  return { url: data.publicUrl };
}
