"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";

export async function signInAction(
  email: string,
  password: string,
): Promise<{ error: string } | void> {
  if (!email || !password) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.code === "email_not_confirmed") {
      return {
        error: "이메일 인증이 완료되지 않았습니다. 받은 메일함을 확인해주세요.",
      };
    }
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  redirect("/members");
}
