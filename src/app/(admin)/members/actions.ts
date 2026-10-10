"use server";

import * as XLSX from "xlsx";
import {
  createMember,
  updateMember,
  deleteMember,
  getAllMembers,
  replaceAllMembers,
} from "@/libs/supabase/queries/members.admin";
import { buildMembersFromSheetRows } from "@/libs/member-import";
import type {
  MemberImportRow,
  MemberImportRowError,
} from "@/libs/member-import";
import type { Member, MemberFormInput } from "@/types/member";

export async function createMemberAction(
  input: MemberFormInput,
): Promise<Member> {
  return createMember(input);
}

export async function updateMemberAction(
  id: string,
  input: MemberFormInput,
): Promise<Member> {
  return updateMember(id, input);
}

export async function deleteMemberAction(id: string): Promise<void> {
  return deleteMember(id);
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
    await replaceAllMembers(rows);
    return { success: true };
  } catch (err) {
    console.error("[confirmMemberImportAction]", err);
    return {
      error: err instanceof Error ? err.message : "구성원 교체에 실패했습니다.",
    };
  }
}
