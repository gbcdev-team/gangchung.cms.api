import { createClient } from "@/libs/supabase/client";
import type { ProfileRole } from "@/types/auth";

export async function signUpWithEmail(
  email: string,
  password: string,
  redirectTo: string,
  role: ProfileRole,
  fullName: string,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: { role, full_name: fullName },
    },
  });

  if (error) {
    const isDuplicateEmail =
      error.code === "user_already_exists" ||
      error.code === "email_exists" ||
      /already registered|already exists/i.test(error.message);
    return {
      error: isDuplicateEmail ? "이미 존재한 이메일 입니다" : error.message,
    };
  }

  // Confirm email이 켜진 프로젝트는 이미 가입된 이메일이어도 에러를 던지지 않고
  // identities가 빈 배열인 가짜 성공 응답을 준다(이메일 존재 여부 추측 방지) — 이걸로 판별한다.
  if (data.user && data.user.identities?.length === 0) {
    return { error: "이미 존재한 이메일 입니다" };
  }

  return { error: null };
}
