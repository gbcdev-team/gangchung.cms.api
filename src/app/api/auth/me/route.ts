import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import { getProfileById } from "@/libs/supabase/queries/profile";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ user: null, profile: null }, { status: 401 });
  }

  const profile = await getProfileById(user.id);
  // email은 gangchung_profiles가 아니라 auth.users가 유일한 출처
  const resolvedProfile = profile
    ? { ...profile, email: user.email ?? profile.email }
    : null;

  return NextResponse.json({ user, profile: resolvedProfile });
}
