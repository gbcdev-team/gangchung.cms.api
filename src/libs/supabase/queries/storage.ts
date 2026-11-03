import { createAdminClient } from "@/libs/supabase/admin";

const AVATAR_BUCKET = "avatars";
export const MINISTRY_HISTORY_BUCKET = "ministry-history";
const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
};

export async function uploadImage(
  file: File,
  bucket: string,
  namePrefix: string,
): Promise<string> {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) throw new Error("허용되지 않는 파일 형식입니다.");
  if (file.size > MAX_SIZE) throw new Error("파일 크기는 5MB 이하여야 합니다.");

  const supabase = createAdminClient();
  const path = `${namePrefix}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function uploadAvatar(file: File, userId: string): Promise<string> {
  return uploadImage(file, AVATAR_BUCKET, userId);
}
