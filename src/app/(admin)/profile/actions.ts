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

const MIN_PASSWORD_LENGTH = 6;

export async function changePasswordAction(
  currentPassword: string,
  newPassword: string,
): Promise<{ error: string } | { ok: true }> {
  if (!currentPassword) {
    return { error: "현재 비밀번호를 입력해주세요" };
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { error: `새 비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다` };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { error: "인증 정보가 올바르지 않습니다" };
  }

  // 세션만으로는 변경하지 못하도록 현재 비밀번호를 서버에서 다시 확인한다.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) {
    return { error: "현재 비밀번호가 올바르지 않습니다" };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    if (error.code === "same_password") {
      return { error: "현재 비밀번호와 다른 비밀번호를 입력해주세요" };
    }
    if (error.code === "weak_password") {
      return { error: "비밀번호가 너무 약합니다. 더 복잡하게 입력해주세요" };
    }
    return { error: "비밀번호 변경 중 오류가 발생했습니다" };
  }

  return { ok: true };
}
