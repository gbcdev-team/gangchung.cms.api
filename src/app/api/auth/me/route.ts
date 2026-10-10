import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import type { UserProfile } from "@/types/auth";
import { getProfileById } from "@/libs/supabase/queries/profile";

export const dynamic = "force-dynamic";

const mockEmail = process.env.EMAIL ?? "admin@gospelfix.com";
const adminProfileId = process.env.ADMIN_PROFILE_ID;

const FALLBACK_PROFILE: UserProfile = {
  id: "mock-user-id",
  email: mockEmail,
  full_name: "Admin",
  avatar_url: null,
  role: "admin",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

export async function GET() {
  const cookieStore = cookies();
  const isMock = cookieStore.get("mock-auth")?.value === "true";

  if (!isMock) {
    return NextResponse.json({ user: null, profile: null }, { status: 401 });
  }

  const profile = adminProfileId ? await getProfileById(adminProfileId) : null;
  const resolvedProfile = profile ?? FALLBACK_PROFILE;

  const user = {
    id: resolvedProfile.id,
    email: resolvedProfile.email,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: resolvedProfile.created_at,
  } as User;

  return NextResponse.json({ user, profile: resolvedProfile });
}
