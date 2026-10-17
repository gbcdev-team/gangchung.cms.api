"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/libs/supabase/client";
import type { UserProfile } from "@/types/auth";

export const AUTH_QUERY_KEY = ["auth", "me"] as const;

export type AuthMeResponse = { user: User | null; profile: UserProfile | null };

export async function fetchAuthMe(): Promise<AuthMeResponse> {
  const res = await fetch("/api/auth/me");
  if (!res.ok) return { user: null, profile: null };
  return res.json();
}

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchAuthMe,
  });

  const user = data?.user ?? null;
  const profile = data?.profile ?? null;
  const isAuthenticated = !isLoading && user !== null;
  const canManageAllMembers =
    profile?.role === "목사" || profile?.role === "전도사";
  const canRunExcelReplace =
    profile?.role === "목사" || profile?.role === "전도사";

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    queryClient.setQueryData<AuthMeResponse>(AUTH_QUERY_KEY, {
      user: null,
      profile: null,
    });
    router.push("/sign/in");
  };

  return {
    user,
    loading: isLoading,
    profile,
    isAuthenticated,
    canManageAllMembers,
    canRunExcelReplace,
    signOut,
  };
}
