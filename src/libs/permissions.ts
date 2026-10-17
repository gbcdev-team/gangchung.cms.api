import { createClient } from "@/libs/supabase/server";
import { getProfileById } from "@/libs/supabase/queries/profile";
import { getDescendantIds } from "@/libs/member-tree";
import { TOP_LEVEL_POSITIONS } from "@/libs/member-roles";
import type { Member, MemberFormInput, MemberPosition } from "@/types/member";
import type { UserProfile } from "@/types/auth";

// 비최상위 직분이 가질 수 있는 유일한 부모 직분. canCreateMember/canUpdateMember는
// 호출 시점에 이미 position이 top-level이 아님을 보장하므로 이 맵에 항상 값이 있다.
const REQUIRED_PARENT_POSITION: Partial<
  Record<MemberPosition, MemberPosition>
> = {
  목자: "초원지기",
  목원: "목자",
};

function parentPositionIsValid(
  childPosition: MemberPosition,
  parentId: string | null,
  allMembers: Member[],
): boolean {
  const required = REQUIRED_PARENT_POSITION[childPosition];
  if (!required || !parentId) return false;
  const parent = allMembers.find((m) => m.id === parentId);
  return parent?.position === required;
}

export interface Viewer {
  profile: UserProfile;
}

export async function getViewer(): Promise<Viewer | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await getProfileById(user.id);
  if (!profile) return null;

  return { profile };
}

// 뷰어가 쓰기 권한을 갖는 구성원 id 집합(목사/전도사는 호출하지 않음 — 이미 전체 허용).
// member_id가 연결 안 된 초원지기/목자는 빈 집합 → 모든 쓰기 거부(fail-safe).
function ownTreeIds(viewer: Viewer, allMembers: Member[]): Set<string> {
  const memberId = viewer.profile.member_id;
  if (!memberId) return new Set();
  return new Set([memberId, ...getDescendantIds(memberId, allMembers)]);
}

export function canReplaceAllMembers(viewer: Viewer): boolean {
  return viewer.profile.role === "목사" || viewer.profile.role === "전도사";
}

export function canCreateMember(
  viewer: Viewer,
  input: MemberFormInput,
  allMembers: Member[],
): boolean {
  const { role } = viewer.profile;
  if (role === "목사" || role === "전도사") return true;
  if (TOP_LEVEL_POSITIONS.includes(input.position)) return false;
  if (!parentPositionIsValid(input.position, input.parent_id, allMembers)) {
    return false;
  }

  const tree = ownTreeIds(viewer, allMembers);

  if (role === "초원지기") {
    return !!input.parent_id && tree.has(input.parent_id);
  }
  if (role === "목자") {
    return (
      input.position === "목원" && input.parent_id === viewer.profile.member_id
    );
  }
  return false;
}

export function canUpdateMember(
  viewer: Viewer,
  target: Member,
  input: MemberFormInput,
  allMembers: Member[],
): boolean {
  const { role } = viewer.profile;
  if (role === "목사" || role === "전도사") return true;

  // 본인 레코드는 직분/상위 리더(=승격·범위 변경 경로)만 막고 다른 필드는 허용한다.
  if (target.id === viewer.profile.member_id) {
    return (
      input.position === target.position && input.parent_id === target.parent_id
    );
  }

  const tree = ownTreeIds(viewer, allMembers);

  if (role === "초원지기") {
    if (!tree.has(target.id)) return false;
    if (TOP_LEVEL_POSITIONS.includes(input.position)) return false;
    if (!parentPositionIsValid(input.position, input.parent_id, allMembers)) {
      return false;
    }
    return !!input.parent_id && tree.has(input.parent_id);
  }
  if (role === "목자") {
    if (target.parent_id !== viewer.profile.member_id) return false;
    return (
      input.position === "목원" && input.parent_id === viewer.profile.member_id
    );
  }
  return false;
}

export function canDeleteMember(
  viewer: Viewer,
  target: Member,
  allMembers: Member[],
): boolean {
  const { role } = viewer.profile;
  if (role === "목사" || role === "전도사") return true;
  if (target.id === viewer.profile.member_id) return false; // 자기 자신 삭제 금지

  const tree = ownTreeIds(viewer, allMembers);
  if (role === "초원지기") return tree.has(target.id);
  if (role === "목자") return target.parent_id === viewer.profile.member_id;
  return false;
}
