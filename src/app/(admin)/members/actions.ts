"use server";

import * as XLSX from "xlsx";
import {
  createMember,
  updateMember,
  deleteMember,
  getAllMembers,
  getMemberByIdAdmin,
  replaceAllMembers,
} from "@/libs/supabase/queries/members.admin";
import {
  buildMembersFromSheetRows,
  buildSheetRowsFromMembers,
} from "@/libs/member-import";
import type {
  MemberImportRow,
  MemberImportRowError,
} from "@/libs/member-import";
import {
  getViewer,
  canCreateMember,
  canUpdateMember,
  canDeleteMember,
  canReplaceAllMembers,
} from "@/libs/permissions";
import type { Member, MemberFormInput } from "@/types/member";

export async function createMemberAction(
  input: MemberFormInput,
): Promise<Member> {
  const viewer = await getViewer();
  if (!viewer) throw new Error("로그인이 필요합니다.");

  const allMembers = await getAllMembers();
  if (!canCreateMember(viewer, input, allMembers)) {
    throw new Error("이 구성원을 등록할 권한이 없습니다.");
  }
  return createMember(input);
}

export async function updateMemberAction(
  id: string,
  input: MemberFormInput,
): Promise<Member> {
  const viewer = await getViewer();
  if (!viewer) throw new Error("로그인이 필요합니다.");

  const target = await getMemberByIdAdmin(id);
  if (!target) throw new Error("구성원을 찾을 수 없습니다.");

  const allMembers = await getAllMembers();
  if (!canUpdateMember(viewer, target, input, allMembers)) {
    throw new Error("이 구성원을 수정할 권한이 없습니다.");
  }
  return updateMember(id, input);
}

export async function deleteMemberAction(id: string): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) throw new Error("로그인이 필요합니다.");

  const target = await getMemberByIdAdmin(id);
  if (!target) throw new Error("구성원을 찾을 수 없습니다.");

  const allMembers = await getAllMembers();
  if (!canDeleteMember(viewer, target, allMembers)) {
    throw new Error("이 구성원을 삭제할 권한이 없습니다.");
  }
  return deleteMember(id);
}

export async function exportMembersAction(): Promise<{
  base64: string;
  filename: string;
}> {
  const viewer = await getViewer();
  if (!viewer) throw new Error("로그인이 필요합니다.");

  const members = await getAllMembers();
  const sheet = XLSX.utils.json_to_sheet(buildSheetRowsFromMembers(members));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "구성원");
  const base64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });

  return {
    base64,
    filename: `구성원_목록_${new Date().toISOString().slice(0, 10)}.xlsx`,
  };
}

export interface MemberImportPreview {
  currentCount: number;
  nextCount: number;
  errors: MemberImportRowError[];
  rows: MemberImportRow[];
}

export async function previewMemberImportAction(
  formData: FormData,
): Promise<MemberImportPreview | { error: string }> {
  const viewer = await getViewer();
  if (!viewer || !canReplaceAllMembers(viewer)) {
    return { error: "구성원 전체 교체 권한이 없습니다." };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "엑셀 파일을 선택해주세요." };
  if (file.size > 5 * 1024 * 1024)
    return { error: "파일 크기는 5MB 이하여야 합니다." };

  try {
    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(buf, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    });
    const result = buildMembersFromSheetRows(rawRows);
    const currentCount = (await getAllMembers()).length;

    return {
      currentCount,
      nextCount: result.rows.length,
      errors: result.errors,
      rows: result.rows,
    };
  } catch (err) {
    console.error("[previewMemberImportAction]", err);
    return {
      error:
        "엑셀 파일을 읽는 중 오류가 발생했습니다. 파일 형식을 확인해주세요.",
    };
  }
}

export async function confirmMemberImportAction(
  rows: MemberImportRow[],
): Promise<{ error: string } | { success: true }> {
  try {
    const viewer = await getViewer();
    if (!viewer || !canReplaceAllMembers(viewer)) {
      return { error: "구성원 전체 교체 권한이 없습니다." };
    }
    await replaceAllMembers(rows);
    return { success: true };
  } catch (err) {
    console.error("[confirmMemberImportAction]", err);
    return {
      error: err instanceof Error ? err.message : "구성원 교체에 실패했습니다.",
    };
  }
}
