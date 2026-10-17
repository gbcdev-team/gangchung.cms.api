import type { MemberPosition } from "@/types/member";

export type ProfileRole = Extract<
  MemberPosition,
  "초원지기" | "목자" | "목사" | "전도사"
>;

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: ProfileRole;
  member_id: string | null;
  created_at: string;
  updated_at: string;
}
