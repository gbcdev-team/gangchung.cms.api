import { createAdminClient } from "@/libs/supabase/admin";
import type { UserProfile } from "@/types/auth";

export async function getProfileById(id: string): Promise<UserProfile | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gangchung_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateProfile(
  id: string,
  updates: { full_name: string; avatar_url?: string | null },
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("gangchung_profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
