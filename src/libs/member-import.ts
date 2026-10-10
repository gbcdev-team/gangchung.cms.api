import { randomUUID } from "crypto";
import type { Member, MemberGender, MemberPosition } from "@/types/member";

export type MemberImportRow = Omit<Member, "created_at" | "updated_at">;

export interface MemberImportRowError {
  rowNumber: number;
  message: string;
}

export interface MemberImportResult {
  rows: MemberImportRow[];
  errors: MemberImportRowError[];
}

export const POSITIONS: MemberPosition[] = [
  "초원지기",
  "목자",
  "목원",
  "임원단",
];
const TOP_LEVEL_POSITIONS: MemberPosition[] = ["초원지기", "임원단"];
const GENDERS: MemberGender[] = ["남", "여"];
const BIRTH_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

interface ParsedRow {
  rowNumber: number;
  name: string;
  phone: string;
  gender: string;
  age_group: string;
  birth_date: string;
  position: MemberPosition;
  leaderName: string;
}

function cell(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parseRows(rawRows: Record<string, unknown>[]): {
  parsedRows: ParsedRow[];
  errors: MemberImportRowError[];
} {
  const errors: MemberImportRowError[] = [];
  const parsedRows: ParsedRow[] = [];

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2; // 헤더=1행, 데이터는 2행부터
    const name = cell(raw, "이름");
    if (!name) return; // 빈 행은 건너뜀

    const positionRaw = cell(raw, "직분");
    if (!POSITIONS.includes(positionRaw as MemberPosition)) {
      errors.push({
        rowNumber,
        message: `직분 값이 올바르지 않습니다: "${positionRaw}" (초원지기/목자/목원/임원단 중 하나여야 합니다)`,
      });
      return;
    }
    const position = positionRaw as MemberPosition;

    const genderRaw = cell(raw, "성별");
    if (genderRaw && !GENDERS.includes(genderRaw as MemberGender)) {
      errors.push({
        rowNumber,
        message: `성별 값이 올바르지 않습니다: "${genderRaw}" (남/여 또는 공란이어야 합니다)`,
      });
      return;
    }

    const birthDate = cell(raw, "생년월일");
    if (birthDate && !BIRTH_DATE_REGEX.test(birthDate)) {
      errors.push({
        rowNumber,
        message: `생년월일 형식이 올바르지 않습니다: "${birthDate}" (YYYY-MM-DD 형식이어야 합니다)`,
      });
      return;
    }

    parsedRows.push({
      rowNumber,
      name,
      phone: cell(raw, "전화번호"),
      gender: genderRaw,
      age_group: cell(raw, "나이또래"),
      birth_date: birthDate,
      position,
      leaderName: cell(raw, "상위리더이름"),
    });
  });

  return { parsedRows, errors };
}

function resolveHierarchy(
  parsedRows: ParsedRow[],
  errors: MemberImportRowError[],
): MemberImportRow[] {
  // 1차 패스: id 발급 + 초원지기/목자 이름 → id 맵(참조 대상이 되는 직분만)
  const nameMap = new Map<string, string>(); // `${position}:${name}` -> id
  const firstSeenRow = new Map<string, number>(); // `${position}:${name}` -> 최초 등장 행 번호
  const flaggedDuplicateKeys = new Set<string>();
  const idByRowNumber = new Map<number, string>();

  for (const row of parsedRows) {
    const id = randomUUID();
    idByRowNumber.set(row.rowNumber, id);

    if (row.position === "초원지기" || row.position === "목자") {
      const key = `${row.position}:${row.name}`;
      if (nameMap.has(key)) {
        const duplicateMessage = `같은 직분(${row.position}) 안에 이름이 중복되어 상위 리더로 참조할 때 모호합니다: "${row.name}"`;
        if (!flaggedDuplicateKeys.has(key)) {
          flaggedDuplicateKeys.add(key);
          errors.push({
            rowNumber: firstSeenRow.get(key)!,
            message: duplicateMessage,
          });
        }
        errors.push({ rowNumber: row.rowNumber, message: duplicateMessage });
      } else {
        nameMap.set(key, id);
        firstSeenRow.set(key, row.rowNumber);
      }
    }

    if (TOP_LEVEL_POSITIONS.includes(row.position) && row.leaderName) {
      errors.push({
        rowNumber: row.rowNumber,
        message: `"${row.position}"는 최상위 직분이라 상위리더이름을 비워둬야 합니다.`,
      });
    }
  }

  // 2차 패스: parent_id 확정
  const rows: MemberImportRow[] = [];
  for (const row of parsedRows) {
    const id = idByRowNumber.get(row.rowNumber)!;
    let parent_id: string | null = null;

    if (row.position === "목자") {
      if (!row.leaderName) {
        errors.push({
          rowNumber: row.rowNumber,
          message: "목자는 상위리더이름(초원지기 이름)이 필요합니다.",
        });
      } else {
        const parentId = nameMap.get(`초원지기:${row.leaderName}`);
        if (!parentId) {
          errors.push({
            rowNumber: row.rowNumber,
            message: `존재하지 않는 초원지기 이름입니다: "${row.leaderName}"`,
          });
        } else {
          parent_id = parentId;
        }
      }
    } else if (row.position === "목원") {
      if (!row.leaderName) {
        errors.push({
          rowNumber: row.rowNumber,
          message: "목원은 상위리더이름(목자 이름)이 필요합니다.",
        });
      } else {
        const parentId = nameMap.get(`목자:${row.leaderName}`);
        if (!parentId) {
          errors.push({
            rowNumber: row.rowNumber,
            message: `존재하지 않는 목자 이름입니다: "${row.leaderName}"`,
          });
        } else {
          parent_id = parentId;
        }
      }
    }

    rows.push({
      id,
      name: row.name,
      phone: row.phone || null,
      gender: (row.gender || null) as MemberGender | null,
      age_group: row.age_group || null,
      birth_date: row.birth_date || null,
      position: row.position,
      parent_id,
    });
  }

  return rows;
}

export function buildMembersFromSheetRows(
  rawRows: Record<string, unknown>[],
): MemberImportResult {
  const { parsedRows, errors } = parseRows(rawRows);
  const rows = resolveHierarchy(parsedRows, errors);

  return {
    rows: errors.length > 0 ? [] : rows,
    errors,
  };
}
