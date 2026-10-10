import { createAdminClient } from "@/libs/supabase/admin";
import type { Member, MemberFormInput } from "@/types/member";
import { POSITIONS, type MemberImportRow } from "@/libs/member-import";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertValidUUID(id: string): void {
  if (!id || !UUID_REGEX.test(id))
    throw new Error("유효하지 않은 구성원 ID입니다.");
}

function assertValidImportRows(rows: MemberImportRow[]): void {
  for (const row of rows) {
    assertValidUUID(row.id);
    if (!POSITIONS.includes(row.position))
      throw new Error(`유효하지 않은 직분입니다: ${row.position}`);
    if (row.parent_id) assertValidUUID(row.parent_id);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toMember(row: any): Member {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? null,
    gender: row.gender ?? null,
    age_group: row.age_group ?? null,
    birth_date: row.birth_date ?? null,
    position: row.position,
    parent_id: row.parent_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toMemberPayload(input: MemberFormInput) {
  return {
    name: input.name,
    phone: input.phone || null,
    gender: input.gender || null,
    age_group: input.age_group || null,
    birth_date: input.birth_date || null,
    position: input.position,
    parent_id: input.position === "초원지기" ? null : input.parent_id,
  };
}

export async function getAllMembers(): Promise<Member[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gangchung_members")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[getAllMembers]", error);
    throw new Error("구성원 목록을 불러오지 못했습니다.");
  }
  return (data ?? []).map(toMember);
}

export async function getMemberByIdAdmin(id: string): Promise<Member | null> {
  assertValidUUID(id);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gangchung_members")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[getMemberByIdAdmin]", error);
    throw new Error("구성원을 불러오지 못했습니다.");
  }
  return toMember(data);
}

export async function createMember(input: MemberFormInput): Promise<Member> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gangchung_members")
    .insert(toMemberPayload(input))
    .select()
    .single();
  if (error) {
    console.error("[createMember]", error);
    throw new Error("구성원 저장에 실패했습니다.");
  }
  return toMember(data);
}

export async function updateMember(
  id: string,
  input: MemberFormInput,
): Promise<Member> {
  assertValidUUID(id);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gangchung_members")
    .update({ ...toMemberPayload(input), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("[updateMember]", error);
    throw new Error("구성원 수정에 실패했습니다.");
  }
  return toMember(data);
}

export async function deleteMember(id: string): Promise<void> {
  assertValidUUID(id);
  const supabase = createAdminClient();

  const { data: children, error: childrenError } = await supabase
    .from("gangchung_members")
    .select("id")
    .eq("parent_id", id)
    .limit(1);
  if (childrenError) {
    console.error("[deleteMember] children check", childrenError);
    throw new Error("구성원 삭제 가능 여부를 확인하지 못했습니다.");
  }
  if (children && children.length > 0) {
    throw new Error(
      "하위 구성원이 있어 삭제할 수 없습니다. 먼저 하위 구성원을 다른 리더로 재배정하거나 삭제하세요.",
    );
  }

  const { error } = await supabase
    .from("gangchung_members")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("[deleteMember]", error);
    throw new Error("구성원 삭제에 실패했습니다.");
  }
}

export async function replaceAllMembers(
  rows: MemberImportRow[],
): Promise<void> {
  if (rows.length === 0) {
    throw new Error("반영할 구성원이 없어 전체 교체를 실행할 수 없습니다.");
  }
  assertValidImportRows(rows);
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("replace_all_members", {
    members: rows,
  });
  if (error) {
    console.error("[replaceAllMembers]", error);
    throw new Error("구성원 전체 교체에 실패했습니다.");
  }
}
