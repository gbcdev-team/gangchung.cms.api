"use server";

import { cookies } from "next/headers";
import { updateProfile } from "@/libs/supabase/queries/profile";
import { uploadAvatar } from "@/libs/supabase/queries/storage";

export async function updateProfileAction(
  fullName: string,
  avatarForm: FormData,
  removeAvatar: boolean,
): Promise<{ error: string } | { avatar_url: string | null | undefined }> {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get("mock-auth")?.value === "true";
  const id = process.env.ADMIN_PROFILE_ID;

  if (!isAuthenticated || !id) {
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
