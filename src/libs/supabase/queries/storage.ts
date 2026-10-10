import { createAdminClient } from "@/libs/supabase/admin";

const AVATAR_BUCKET = "avatars";
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

export async function uploadAvatar(
  file: File,
  userId: string,
): Promise<string> {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) throw new Error("허용되지 않는 파일 형식입니다.");
  if (file.size > MAX_SIZE) throw new Error("파일 크기는 5MB 이하여야 합니다.");

  const supabase = createAdminClient();
  const path = `${userId}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
