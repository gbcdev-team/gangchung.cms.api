# 구성원 엑셀 다운로드 기능

## Context

`/members` 페이지에는 이미 "엑셀로 전체 교체"(업로드) 기능이 있지만, 반대 방향인 "현재 구성원을 엑셀로 내보내기"는 없다. 관리자가 현재 등록된 구성원 전체를 엑셀 파일로 받아 보거나, 받은 파일을 수정해서 다시 "엑셀로 전체 교체"에 업로드하는 흐름(백업/일괄 수정)을 지원하기 위한 기능이다.

이 레포는 이미 `xlsx`(SheetJS 0.20.3) 패키지로 엑셀 업로드 파싱을 하고 있고(`src/libs/member-import.ts`, `src/app/(admin)/members/actions.ts`), 같은 패키지로 쓰기(write)도 지원하므로 새 의존성 없이 구현 가능하다(GFix 사다리 5번: 이미 설치된 패키지로 해결). 업로드 시 기대하는 컬럼 헤더(`이름`/`직분`/`성별`/`생년월일`/`전화번호`/`나이또래`/`상위리더이름`, `src/libs/member-import.ts`의 `cell(raw, "...")` 호출들로 확인됨)와 **동일한 헤더로 내보내야** 다운로드한 파일을 그대로 다시 업로드할 수 있다 — 이게 이 기능의 핵심 제약이다.

## 설계

### 1. 내보내기 행 변환 — `src/libs/member-import.ts`에 함수 추가

업로드 파싱 로직(`buildMembersFromSheetRows`)과 짝을 이루는 역변환 함수를 같은 파일에 추가한다(헤더 계약의 단일 소스 유지):

```ts
export function buildSheetRowsFromMembers(
  members: Member[],
): Record<string, string>[] {
  const nameById = new Map(members.map((m) => [m.id, m.name]));
  return members.map((m) => ({
    이름: m.name,
    직분: m.position,
    상위리더이름: m.parent_id ? (nameById.get(m.parent_id) ?? "") : "",
    전화번호: m.phone ?? "",
    성별: m.gender ?? "",
    나이또래: m.age_group ?? "",
    생년월일: m.birth_date ?? "",
  }));
}
```

### 2. Server Action — `src/app/(admin)/members/actions.ts`에 추가

이미 import된 `XLSX`, `getAllMembers`, `getViewer`를 재사용한다. 파일을 서버 파일시스템에 쓰지 않고(`XLSX.writeFile`은 Node 전용 fs 접근이라 Vercel 서버리스에 부적합) `XLSX.write(..., { type: "base64" })`로 base64 문자열을 반환해 클라이언트에서 Blob으로 변환한다.

```ts
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
```

권한: 조회는 전체 공개([[project_excel-member-import-feature]] 당시 합의한 "조회는 전체 공개, 쓰기만 역할 차등" 정책)라 로그인 여부만 확인하고 역할 제한은 두지 않는다(목자도 다운로드 가능, 업로드/전체교체만 목사·전도사 제한 유지).

### 3. 다운로드 트리거 — 신규 클라이언트 컴포넌트 `src/app/(admin)/members/MemberExportButton.tsx`

base64 → `Uint8Array` → `Blob` 변환 후 임시 `<a download>` 클릭으로 다운로드한다(별도 Route Handler 불필요 — 구성원 ~281명 규모면 base64 왕복 오버헤드가 무시할 만함). `MemberImportDialog.tsx`와 동일한 버튼 스타일(`bg-white dark:bg-gray-800 border ...`)을 쓰고 아이콘만 `lucide-react`의 `Download`로 바꾼다.

### 4. `src/app/(admin)/members/page.tsx` 배치

헤더 버튼 그룹에 `MemberExportButton`을 추가한다. 업로드(`MemberImportDialog`, 목사/전도사만)와 짝을 이루도록 그 옆에 배치하되, 다운로드는 `showExcelReplace` 조건 없이 항상 노출한다:

```tsx
<div className="flex items-center gap-2">
  <MemberExportButton />
  {showExcelReplace && <MemberImportDialog currentCount={members.length} />}
  <Link href="/members/new" ...>새 구성원</Link>
</div>
```

## 검증

1. `npx tsc --noEmit`로 타입 체크
2. `yarn dev` 후 `/members`에서 로그인 상태로 "엑셀 다운로드" 클릭 → 파일이 실제로 다운로드되는지 확인
3. 다운로드된 파일을 "엑셀로 전체 교체" 다이얼로그에서 선택해 **미리보기까지만** 열어보고(확정/반영은 누르지 않음) 오류 0건·인원수가 현재와 일치하는지로 헤더 호환성(라운드트립)을 확인 — 실제 DB를 건드리지 않는 안전한 검증 방법
4. 목자 역할 계정으로 로그인해도 다운로드 버튼이 보이고 정상 동작하는지 확인(조회 공개 정책 검증)
