import type { MemberPosition } from "@/types/member";
import type { ProfileRole } from "@/types/auth";

export const MEMBER_POSITIONS: MemberPosition[] = [
  "초원지기",
  "목자",
  "목원",
  "임원단",
  "목사",
  "전도사",
];

export const TOP_LEVEL_POSITIONS: MemberPosition[] = [
  "초원지기",
  "임원단",
  "목사",
  "전도사",
];

export const PROFILE_ROLES: ProfileRole[] = [
  "초원지기",
  "목자",
  "목사",
  "전도사",
];

// 회원가입 폼에서 본인이 직접 선택할 수 있는 역할만. 목사/전도사는 전체 쓰기 권한을
// 즉시 받으므로 자가선택 대상에서 제외 — 기존 관리자가 수동으로 승격해야 한다.
export const SELF_SERVICE_ROLES: ProfileRole[] = ["초원지기", "목자"];
