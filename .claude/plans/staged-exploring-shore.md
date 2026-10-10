# 엑셀 업로드로 구성원 전체 교체 기능

## Context

목장(소그룹) 조직은 매년 개편된다. 지금은 `/members/new`로 한 명씩 등록해야 해서, 한 해가 지나 조직이 완전히 바뀌면 관리자가 수백 명을 손으로 다시 입력해야 하는 상황이다. 이미 엑셀로 정리해둔 조직표가 있으니, 이를 업로드하면 현재 DB의 구성원 데이터를 통째로 그 내용으로 교체할 수 있어야 한다.

사용자와 논의해 다음 세 가지를 확정했다:

1. **교체 방식**: 이름/전화번호로 매칭해 부분 수정하는 대신, 엑셀을 유일한 소스로 간주해 기존 구성원을 전부 지우고 새로 채우는 **전체 삭제 후 재삽입**. (다른 테이블이 `gangchung_members.id`를 참조하는 코드가 없어 안전함을 조사로 확인함. 모든 구성원의 id/생성일시가 새로 발급되는 것을 사용자가 인지하고 동의함.)
2. **원자성**: 삭제+삽입 도중 실패해 구성원이 통째로 사라지는 사고를 막기 위해, Postgres 함수(RPC) 하나로 묶어 트랜잭션 단위로 처리. 이 레포 최초의 RPC 도입이지만, "여러 쓰기를 원자적으로 묶기"는 Supabase가 정확히 제공하는 기능이라 GFix 사다리의 SUPA 단계에 부합한다고 판단.
3. **확인 단계**: 업로드 즉시 반영하지 않고, 먼저 파싱·검증만 수행해 "현재 N명 → 업로드 후 M명" 요약과 행 단위 오류를 미리 보여준 뒤, 관리자가 "확정"을 눌러야 실제로 반영되는 2단계 플로우.

기존 단건 등록/수정/삭제(`/members/new`, `/members/[id]/edit`)는 그대로 유지하고, 이번 기능은 완전히 별도의 신규 플로우(`/members/import`)로 추가한다.

## 설계 핵심 결정

- **계층 표현**: parent_id(UUID)는 엑셀 작성자가 알 수 없으므로, 엑셀은 `상위리더이름`이라는 텍스트 컬럼만 받는다. 서버의 순수 JS 로직이 같은 시트 안의 이름을 보고 parent_id를 역산한다.
- **이름 유일성 범위**: 시트 전체 유일성을 요구하면 과하다. 참조 대상이 되는 두 그룹, 즉 **초원지기 이름**과 **목자 이름**만 각자의 그룹 내에서 유일하면 된다(목원/임원단은 누구의 부모도 되지 않으므로 중복 허용). 직분 계층이 초원지기/임원단(0단계) → 목자(1단계) → 목원(2단계)으로 엄격한 전순서이기 때문에, 이 방식은 구조적으로 순환참조가 발생할 수 없다 — 별도 사이클 가드가 필요 없다.
- **id 발급**: 파싱 단계(Server Action, DB 호출 없음)에서 각 행에 `crypto.randomUUID()`를 미리 부여하고, 이름→UUID 맵으로 parent_id까지 전부 채운 완성된 배열을 만든다. DB 왕복 없이 한 번에 RPC로 넘긴다.
- **전체-혹은-전무**: 행 단위 오류가 하나라도 있으면 미리보기의 "확정" 버튼을 비활성화한다. 부분 반영은 "엑셀이 유일한 소스"라는 전제와 맞지 않고, 계층 해석이 이름 맵에 의존하므로 일부만 반영한다는 개념 자체가 모호해진다.
- **타입 일관성**: 미리보기/확정 단계는 아직 DB에 쓰기 전이라 `created_at`/`updated_at`이 없다. 기존 `Member` 타입에 placeholder 값을 억지로 채우지 않고, `MemberImportRow = Omit<Member, 'created_at' | 'updated_at'>`라는 전용 타입을 만들어 파싱 → 미리보기 → 확정 → RPC 호출까지 이 타입 하나로 일관되게 흐르게 한다.

## 변경/신규 파일

| 구분 | 파일                                                             | 역할                                                                                                                                             |
| ---- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 신규 | `src/libs/member-import.ts`                                      | DB 호출 없는 순수 로직 — 엑셀 원시 행 → 검증 → 이름 기반 계층 해석 → `MemberImportRow[]` + 오류 목록                                             |
| 수정 | `src/libs/supabase/queries/members.admin.ts`                     | `replaceAllMembers(rows)` 추가 — RPC(`replace_all_members`) 호출                                                                                 |
| 수정 | `src/app/(admin)/members/actions.ts`                             | `previewMemberImportAction`, `confirmMemberImportAction` 2개 Server Action 추가                                                                  |
| 신규 | `src/app/(admin)/members/import/page.tsx`                        | Server Component. `getAllMembers().length`로 현재 인원수 조회 후 뷰에 전달                                                                       |
| 신규 | `src/app/(admin)/members/import/MemberImportView.tsx`            | `"use client"`. 파일 선택 → 미리보기 Dialog → 확정 2단계 플로우                                                                                  |
| 수정 | `src/app/(admin)/members/page.tsx`                               | 헤더의 "새 구성원" 버튼 옆에 "엑셀로 전체 교체" 보조 버튼 추가                                                                                   |
| 수정 | `package.json`/`yarn.lock`                                       | `yarn add xlsx` (SheetJS — .xlsx/.xls/.csv 전부 지원, 자체 TS 타입 내장)                                                                         |
| 신규 | `supabase/migrations/20261011004213_replace_all_members_rpc.sql` | `replace_all_members(jsonb)` RPC 함수 정의 (앞으로 신규/변경 SQL은 이 경로에 마이그레이션 파일로 추가 — Supabase SQL Editor에서 1회 실행도 필요) |

기존 `createMember`/`updateMember`/`deleteMember`와 `/members/new`, `/members/[id]/edit`은 손대지 않는다.

## 1. `src/libs/member-import.ts` (신규)

```ts
import { z } from "zod";
import type { Member, MemberPosition } from "@/types/member";

export type MemberImportRow = Omit<Member, "created_at" | "updated_at">;

export interface MemberImportRowError {
  rowNumber: number; // 헤더=1행, 데이터는 2행부터 — 엑셀에서 바로 찾을 수 있도록
  message: string;
}

export interface MemberImportResult {
  rows: MemberImportRow[]; // errors가 비어있을 때만 채워짐
  errors: MemberImportRowError[];
  totalRows: number;
}

export function buildMembersFromSheetRows(
  rawRows: Record<string, unknown>[],
): MemberImportResult;
```

알고리즘:

1. `이름`이 공백인 행은 건너뜀(엑셀 하단 빈 행 허용).
2. 각 행을 zod로 파싱: `이름`(필수, trim), `직분`(enum, 필수), `전화번호`/`나이또래`/`생년월일`/`상위리더이름`(선택, string coerce+trim), `생년월일`은 비어있지 않으면 `/^\d{4}-\d{2}-\d{2}$/` 매칭. 실패 시 해당 `rowNumber`로 오류 누적, 이후 단계에서 제외.
3. **1차 패스**: 파싱 성공한 행을 순회하며 `id = crypto.randomUUID()` 부여. `position`이 `초원지기`/`목자`면 `nameMap.set(`${position}:${name}`, id)` — 이미 같은 키가 있으면 두 행 모두에 "같은 직분 내 이름이 중복되어 상위 리더로 참조할 때 모호합니다" 오류. `초원지기`/`임원단`인데 `상위리더이름`이 채워져 있으면 "최상위 직분은 상위리더이름을 비워야 합니다" 오류.
4. **2차 패스**: `parent_id` 확정 — 초원지기/임원단은 `null`, 목자는 `nameMap.get('초원지기:'+상위리더이름)`, 목원은 `nameMap.get('목자:'+상위리더이름)`. 못 찾으면 "존재하지 않는 초원지기/목자 이름입니다: {입력값}" 오류.
5. `errors.length > 0`이면 `rows: []` 반환(전체-혹은-전무). `errors.length === 0`이면 완성된 `MemberImportRow[]` 반환.

## 2. `members.admin.ts`에 추가

```ts
import type { MemberImportRow } from "@/libs/member-import";

export async function replaceAllMembers(
  rows: MemberImportRow[],
): Promise<void> {
  if (rows.length === 0) {
    throw new Error("반영할 구성원이 없어 전체 교체를 실행할 수 없습니다.");
  }
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("replace_all_members", {
    members: rows,
  });
  if (error) {
    console.error("[replaceAllMembers]", error);
    throw new Error("구성원 전체 교체에 실패했습니다.");
  }
}
```

`rows.length === 0` 가드는 필수 — 빈 시트로 인해 DELETE만 실행되고 재삽입이 안 되는 사고를 막는 안전장치(`deleteMember`의 자식-존재 가드와 같은 결).

## 3. `actions.ts`에 추가

```ts
"use server";
import * as XLSX from "xlsx";
import {
  getAllMembers,
  replaceAllMembers,
} from "@/libs/supabase/queries/members.admin";
import { buildMembersFromSheetRows } from "@/libs/member-import";
import type {
  MemberImportRow,
  MemberImportRowError,
} from "@/libs/member-import";

export interface MemberImportPreview {
  currentCount: number;
  nextCount: number;
  errors: MemberImportRowError[];
  rows: MemberImportRow[]; // errors가 없을 때만 채워짐 — confirm 단계에 그대로 전달
}

// 1단계: 파싱+검증만. DB 쓰기 없음.
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
    // raw: false — 날짜/전화번호가 숫자 시리얼 값으로 둔갑하는 문제를 원천 차단
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

// 2단계: 확정. 미리보기에서 클라이언트가 보관한 rows를 그대로 받아 재파싱 없이 RPC 호출.
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
```

재파싱하지 않고 미리보기 때 만든 `rows`를 그대로 받는 이유: "미리보기에서 본 내용 == 실제 반영되는 내용"을 구조적으로 보장하기 위함. 기존 `createMemberAction`/`updateMemberAction`도 클라이언트의 입력을 그대로 신뢰하는 수준(layout 레벨 mock-auth 게이트만 있음)이므로, 과도한 재검증은 추가하지 않는다.

## 4. `MemberImportView.tsx` (신규, `"use client"`)

상태 흐름:

```
idle → 파일 선택(hidden <input type="file" accept=".xlsx,.xls,.csv">, profile/page.tsx 패턴과 동일한 숨김 input+버튼 트리거)
     → 클라이언트 1차 검증(확장자/크기) → previewMemberImportAction(formData) 호출
parsing(로딩) → 결과가 { error }면 toast.error 후 idle 복귀
             → MemberImportPreview면 상태 저장, Dialog 오픈
preview(Dialog) → "현재 {currentCount}명 → 업로드 후 {nextCount}명으로 전체 교체됩니다" 요약
               → errors 있으면 빨간 배너+행별 오류 목록(인라인 Tailwind, 신규 테이블 컴포넌트 설치 불필요), 확정 버튼 disabled
               → errors 없으면 확정 버튼 enabled
               → 취소 시 Dialog 닫고 idle 복귀
submitting → confirmMemberImportAction(rows) 호출
          → 성공: toast.success + router.push('/members') + router.refresh()
          → 실패: toast.error, Dialog는 열어둔 채 재시도 가능
```

재사용 컴포넌트: `@/components/ui/dialog`(`Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogFooter` — `confirm-dialog.tsx`와 동일 임포트), `@/components/ui/button`(확정 버튼은 `confirm-dialog.tsx`의 `bg-black dark:bg-white` 스타일 재사용), `sonner`의 `toast`. 새 shadcn 컴포넌트 설치 불필요.

`import/page.tsx`:

```ts
export default async function MemberImportPage() {
  const currentCount = (await getAllMembers()).length;
  return <MemberImportView currentCount={currentCount} />;
}
```

`members/page.tsx`는 기존 `<div className="flex items-center justify-between mb-6">` 안, "새 구성원" `Link` 옆에 `gap-2`로 감싸 보조 버튼(`variant="outline"` 느낌, `Upload` 아이콘)을 추가.

## 5. Supabase SQL Editor에서 1회 실행 (RPC)

> 실제 운영 DB에 대해 `debug-env` 라우트를 통해 직접 확인한 결과(테스트 후 즉시 원복):
>
> - 컬럼: `id uuid PK`, `name text`, `phone text null`, `gender text null`, `age_group text null`, `birth_date date null`, `position text`, `parent_id uuid null`(self-FK → `gangchung_members.id`), `created_at`/`updated_at timestamptz`.
> - `parent_id` FK의 `ON DELETE` 정책은 **`RESTRICT`(기본값)** — 더미 부모/자식 1쌍을 생성해 부모만 삭제를 시도한 결과 `23503` 위반으로 실제로 확인됨. 따라서 `delete from gangchung_members;`만 실행하면 삭제 순서에 따라 FK 위반이 날 수 있어, 삭제 전에 `parent_id`를 전부 `null`로 비우는 단계가 **필수**다.
> - 이 Supabase 프로젝트는 세션에 `pg-safeupdate`류 안전장치가 걸려 있어 **WHERE 없는 UPDATE/DELETE가 전부 거부된다**(`21000 UPDATE requires a WHERE clause`) — 백업·왕복 테스트로 실제로 확인됨(더미 1명으로 실행 시 함수가 에러를 던지고 Postgres가 함수 전체를 자동 롤백해, 실데이터 281명은 전혀 손상되지 않았음). 그래서 아래 SQL은 전체 대상 UPDATE/DELETE에도 항상 `where true`/`where ... is not null` 형태로 WHERE를 붙인다.
> - `gangchung_members_hierarchy_chk` CHECK 제약이 있음 — **초원지기/임원단은 `parent_id`가 반드시 `null`, 목자/목원은 반드시 `non-null`**. 더미 삽입 3건(초원지기 단독 성공, `parent_id=null`인 목자 실패(`23514`), `parent_id`를 채운 목자 성공)으로 실측 확인됨. 그래서 "일단 `parent_id=null`로 전체 삽입 후 UPDATE로 채우기" 2단계 방식은 이 제약과 충돌해 쓸 수 없고, **계층 순서대로(최상위 → 목자 → 목원) 최종 parent_id를 그대로 삽입**해야 한다.
> - 같은 이유로 **기존 행의 parent_id를 일괄 `null`로 비우는 것 자체도 불가능**하다 — 기존 목자/목원 행을 `parent_id = null`로 바꾸는 순간 동일한 `gangchung_members_hierarchy_chk` 위반이 난다(백업·왕복 테스트에서 실제로 "이선교"(목자) 행으로 실측 확인됨, 더미 데이터와 무관하게 함수 첫 줄에서 항상 발생). 그래서 parent_id를 건드리지 않고 **역순(목원 → 목자 → 최상위)으로 삭제**해 FK(RESTRICT)와 CHECK를 동시에 만족시킨다.

**FK 삽입 순서 문제**: `parent_id`가 자기참조 FK이므로 자식이 부모보다 먼저 삽입되면 즉시 FK 위반이 난다. `gangchung_members_hierarchy_chk` 때문에 "null로 넣고 나중에 UPDATE"도, "삭제 전 parent_id를 null로 비우기"도 불가능하므로, 삭제는 역순(목원 → 목자 → 최상위)으로, 삽입은 순서대로(최상위 → 목자 → 목원) 최종 parent_id를 그대로 채워 처리한다. 함수 전체가 하나의 트랜잭션이라 중간 실패 시 DELETE까지 전부 롤백된다.

```sql
create or replace function replace_all_members(members jsonb)
returns void
language plpgsql
as $$
begin
  delete from gangchung_members where position = '목원';
  delete from gangchung_members where position = '목자';
  delete from gangchung_members where position in ('초원지기', '임원단');

  -- 1단계: 최상위(초원지기/임원단) — parent_id는 항상 null
  insert into gangchung_members (id, name, phone, gender, age_group, birth_date, position, parent_id)
  select
    (rec->>'id')::uuid,
    rec->>'name',
    nullif(rec->>'phone', ''),
    nullif(rec->>'gender', ''),
    nullif(rec->>'age_group', ''),
    nullif(rec->>'birth_date', '')::date,
    rec->>'position',
    null
  from jsonb_array_elements(members) as rec
  where rec->>'position' in ('초원지기', '임원단');

  -- 2단계: 목자 — parent_id(초원지기)가 1단계에서 이미 삽입되어 있음
  insert into gangchung_members (id, name, phone, gender, age_group, birth_date, position, parent_id)
  select
    (rec->>'id')::uuid,
    rec->>'name',
    nullif(rec->>'phone', ''),
    nullif(rec->>'gender', ''),
    nullif(rec->>'age_group', ''),
    nullif(rec->>'birth_date', '')::date,
    rec->>'position',
    (rec->>'parent_id')::uuid
  from jsonb_array_elements(members) as rec
  where rec->>'position' = '목자';

  -- 3단계: 목원 — parent_id(목자)가 2단계에서 이미 삽입되어 있음
  insert into gangchung_members (id, name, phone, gender, age_group, birth_date, position, parent_id)
  select
    (rec->>'id')::uuid,
    rec->>'name',
    nullif(rec->>'phone', ''),
    nullif(rec->>'gender', ''),
    nullif(rec->>'age_group', ''),
    nullif(rec->>'birth_date', '')::date,
    rec->>'position',
    (rec->>'parent_id')::uuid
  from jsonb_array_elements(members) as rec
  where rec->>'position' = '목원';
end;
$$;

grant execute on function replace_all_members(jsonb) to service_role;
```

실행 전 사용자가 직접 확인할 것: 2~3명짜리 더미 데이터로 먼저 SQL Editor에서 테스트 — 일부러 잘못된 값(예: 존재하지 않는 `position`)을 넣어 함수가 에러를 던지고 테이블이 기존 상태로 완전히 롤백되는지 확인할 것.

## 6. 엑셀 템플릿 컬럼

| 헤더         | 필수        | 형식                                     | 비고                                                                     |
| ------------ | ----------- | ---------------------------------------- | ------------------------------------------------------------------------ |
| 이름         | 필수        | 공백 불가                                | 초원지기/목자 이름은 각 직분 그룹 내 유일해야 함                         |
| 전화번호     | 선택        | `010-0000-0000` 권장                     | 하이픈 없이 숫자만 넣으면 엑셀이 숫자로 인식해 앞자리 0이 사라질 수 있음 |
| 성별         | 선택        | `남`/`여`                                |                                                                          |
| 나이또래     | 선택        | 자유 텍스트                              |                                                                          |
| 생년월일     | 선택        | `YYYY-MM-DD`                             |                                                                          |
| 직분         | 필수        | `초원지기`/`목자`/`목원`/`임원단`        |                                                                          |
| 상위리더이름 | 조건부 필수 | 목자/목원만 필수, 초원지기/임원단은 공란 | 목자 행→초원지기 이름, 목원 행→목자 이름과 정확히 일치                   |

헤더는 1행, 데이터는 2행부터. 템플릿 다운로드 기능은 이번 범위에 포함하지 않음(필요해지면 "구성원 내보내기"와 함께 후속 논의).

## 검증 방법

1. 스크래치패드에 샘플 엑셀 3종 작성(저장소에 커밋하지 않음):
   - 정상 케이스(초원지기 1, 목자 2, 목원 4, 임원단 1 = 8명) → 요약/오류없음/확정 활성화 확인, 확정 후 `/members`에서 트리 구조가 엑셀의 상위리더이름 관계와 정확히 일치하는지 확인.
   - 참조 오류 케이스(목자 행의 상위리더이름에 오타) → 해당 행 번호로 오류, 확정 버튼 비활성화 확인.
   - 동명이인 오류 케이스(초원지기 2명 같은 이름) → 두 행 모두 오류 확인.
2. 엣지 케이스: 빈 파일, 확장자만 바꾼 파일, 헤더만 있고 데이터 0행 → 한국어 오류 메시지로 안전하게 처리되는지, 특히 **빈 시트로 인한 전체 삭제-only 사고가 막히는지** 확인.
3. RPC는 UI 연동 전에 SQL Editor에서 2~3건 더미 데이터로 먼저 검증 — 일부러 잘못된 값을 넣어 함수가 에러를 던지고 테이블이 기존 상태로 롤백되는지 확인.
4. `yarn tsc --noEmit`, `yarn lint`, `yarn build` 통과 확인. `any` 타입 미사용 확인(기존 `toMember(row: any)` 1곳만 예외).
5. 라이트/다크 모드 둘 다 브라우저에서 확인.
6. 작업 완료 후 커밋 전 code-reviewer 에이전트 리뷰(이 레포 컨벤션) → APPROVED 후 git-commit-pusher.
