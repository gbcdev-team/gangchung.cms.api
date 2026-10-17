"use server";

import { createClient } from "@/libs/supabase/server";
import { updateProfile } from "@/libs/supabase/queries/profile";
import { uploadAvatar } from "@/libs/supabase/queries/storage";

export async function updateProfileAction(
  fullName: string,
  avatarForm: FormData,
  removeAvatar: boolean,
): Promise<{ error: string } | { avatar_url: string | null | undefined }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const id = user?.id;

  if (!id) {
    return { error: "인증 정보가 올바르지 않습니다" };
  }

  try {
    const avatarFile = avatarForm.get("avatar") as File | null;

    let avatar_url: string | null | undefined = undefined;
    if (avatarFile && avatarFile.size > 0) {
      avatar_url = await uploadAvatar(avatarFile, id);
    } else if (removeAvatar) {
      avatar_url = null;
    }

    await updateProfile(id, { full_name: fullName, avatar_url });
    return { avatar_url };
  } catch {
    return { error: "저장 중 오류가 발생했습니다" };
  }
}
