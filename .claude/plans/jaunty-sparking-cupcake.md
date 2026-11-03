# 지난 사역 히스토리 — 글 CRUD 섹션 추가

## Context

어드민에 "지난 사역 히스토리" 메뉴를 추가해 블로그형 글(제목·슬러그·대표 이미지·카테고리·본문·발행 여부)을 CRUD하고, 발행된 글은 기존 공개 API(`/api/v1/ministry-history`)로 노출한다. 참고 화면은 다른 어드민의 "소식 (Blog)" 목록/작성 화면이다.

확정된 결정:

- 쓰기 권한: **목사/전도사만** (조회는 로그인한 모두)
- "카테고리": 글마다 **자유 입력 텍스트 필드** (메뉴명이 "지난 사역 히스토리")
- 목록 정렬: **드래그 정렬** (`@dnd-kit` 추가)
- 이미지: **대표 이미지 1장**, **공개 API 연동**

## 접근 (기존 패턴 재사용)

members CRUD(`src/app/(admin)/members/*`, `src/libs/supabase/queries/members.admin.ts`)와 같은 구조를 따른다. 공개 API는 코드 없이 `statkit_content_api_configs` 행 추가로 처리한다.

### 1. DB — `supabase/migrations/20261103010000_ministry_history.sql` (신규)

- 작성 전 **라이브 DB에서 `statkit_content_api_configs`의 컬럼/제약을 먼저 조회**한다(스키마 드리프트 규칙).
- `gangchung_ministry_histories`: `id uuid pk default gen_random_uuid()`, `title text not null`, `slug text not null unique`, `thumbnail_url text`, `category text`, `content text` (Tiptap HTML), `is_published bool not null default false`, `sort_order int not null`, `created_at`/`updated_at timestamptz`.
- **`enable row level security`(정책 없음)**: 이 프로젝트는 RLS 정책을 쓰지 않지만 anon key가 브라우저에 노출되므로, 정책 없는 RLS로 anon 직접 접근을 막는다. service role은 우회한다.
- 재정렬 RPC `reorder_ministry_histories(ids uuid[])`: `unnest ... with ordinality`로 `sort_order` 일괄 갱신(WHERE 명시). 파일 끝에 `revoke all ... from public, anon, authenticated`.
- Storage 버킷 `ministry-history`(public) 생성 insert.
- `statkit_content_api_configs`에 행 추가: `resource_slug='ministry-history'`, `filter_column='is_published'`/`filter_value='true'`/`filter_is_bool=true`, `identifier_column='slug'`/`identifier_type='text'`, `order_column='sort_order'`/`order_direction='asc'`, `select_columns`는 노출 컬럼만 명시.

### 2. 권한 — `src/libs/permissions.ts`

`canManageMinistryHistory(viewer)`를 `canReplaceAllMembers`와 같은 형태(`role === "목사" || "전도사"`)로 추가.

### 3. 쿼리 — `src/libs/supabase/queries/ministry-history.admin.ts` (신규)

`members.admin.ts` 형태: `createAdminClient()`, UUID 검증(`assertValidUUID` 재사용, export 안 돼 있으면 export), `list/get/create/update/delete/reorder`, 에러는 `console.error("[fn]")` 후 한글 메시지로 throw. `create`는 `sort_order`를 맨 위(최솟값-1 또는 max+1, 목록 정렬 방향에 맞춤)로 부여. slug 중복(unique 위반)은 한글 메시지로 변환.

### 4. 이미지 업로드 — `src/libs/supabase/queries/storage.ts`

`uploadAvatar`의 버킷 하드코딩을 파라미터화(두 번째 사용처라 상수 복제보다 인자 추가가 더 작음). 5MB / jpeg·png·gif·webp 제한 그대로(화면의 AVIF는 기존 허용 목록에 없으므로 제외).

### 5. Server Actions — `src/app/(admin)/ministry-history/actions.ts` (신규)

`getViewer()` → `canManageMinistryHistory` 판정 → 쿼리 호출. 규칙: members 액션과 동일하게 실패 시 `throw new Error("한글")`, 클라이언트는 `toast` + `router.refresh()`. 이미지는 `FormData`로 받아 `profile/actions.ts` 방식으로 업로드. 클라이언트가 넘긴 id/작성자를 신뢰하지 않고 항상 세션에서 viewer를 해석한다.
액션: create, update, delete, reorder.

### 6. 화면 — `src/app/(admin)/ministry-history/` (신규)

- `page.tsx`(서버): 목록 + "새 글 작성" 링크, 비어 있으면 `EmptyState`. 쓰기 권한 없는 역할에는 버튼/메뉴를 숨긴다(`useAuth` 헬퍼에 `canManageMinistryHistory` 추가).
- `HistoryList.tsx`(client): `@dnd-kit/sortable` 목록, 행에 제목·카테고리 배지·발행 배지·날짜·⋮ 메뉴(수정/삭제, 삭제는 `ConfirmDialog`). 드롭 시 `reorder` 호출.
- `new/page.tsx`, `[id]/edit/page.tsx` + 공용 `HistoryForm.tsx`: react-hook-form + zod(`MemberForm` 패턴). 필드: 제목, 슬러그(기본값 timestamp, 아래에 API URL 안내), 대표 이미지 1장, 카테고리(Input), 본문, 발행 체크박스, 임시저장/취소 버튼. 발행 체크박스는 shadcn 추가 없이 기본 input으로 처리.
- `src/components/admin/RichTextEditor/index.tsx`(신규): 이미 설치된 Tiptap(`starter-kit`, `link`, `underline`, `placeholder`)으로 툴바 B/I/U/S, H1–H3, 목록, 인용, 링크, 구분선만 구현. 글자색·정렬·본문 이미지는 새 패키지가 필요하므로 이번 범위에서 제외. `globals.css:118`의 placeholder 스타일 재사용.

### 7. 메뉴/라우팅

- `src/components/admin/Sidebar/index.tsx:21` `NAV_ITEMS`에 `{ label: "지난 사역 히스토리", href: "/ministry-history" }`
- `src/middleware.ts:5` `ADMIN_PATHS`와 `:86-98` `matcher`에 `/ministry-history` 추가 (matcher 누락 시 미들웨어가 돌지 않음)

### 8. 공개 API 보안 수정 — `src/libs/supabase/queries/content-api-configs.ts:90-109`

`queryConfigDetail`이 `filter_column` 조건을 적용하지 않아 **미발행 글도 slug를 알면 단건 조회가 된다**. 새 리소스를 노출하기 전에 detail에도 같은 필터를 적용한다(기존 리소스 동작도 함께 맞춰짐).

### 9. 의존성

`yarn add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` (yarn 전용). 새 파일이 3개 이상이므로 GFix 사다리를 재확인했으며, 위 항목은 기존 패턴 확장만 사용하고 새 추상화는 만들지 않는다.

## 알려진 한계 / 참고

- 본문은 HTML 문자열로 저장되어 공개 API로 그대로 나간다. 작성자가 목사/전도사로 한정돼 sanitizer는 추가하지 않는다(소비 측에서 렌더링 시 주의).
- OpenAPI(Swagger) 문서는 `TYPED_SLUGS`에 없는 slug라 문서에서 빠질 뿐 동작에는 영향 없음. 이번 범위 제외.
- 마이그레이션 적용은 Supabase에 SQL을 실행해야 한다(적용 방법은 구현 후 안내).

## 검증

1. `yarn lint`, `yarn build` 통과.
2. `yarn dev`: 목사/전도사 계정으로 글 작성(이미지 포함) → 목록 표시 → 수정 → 드래그 순서 변경 후 새로고침해도 유지 → 삭제.
3. 목자/초원지기 계정: 목록은 보이고 작성/수정/삭제 UI가 숨겨지며, 액션을 직접 호출해도 "권한 없음"으로 거부되는지.
4. 공개 API: `curl -H "X-API-Key: ..." /api/v1/ministry-history` 에 발행 글만 나오고, 미발행 글 slug 단건 조회는 404인지. 순서가 `sort_order`를 따르는지.
5. 중복 slug 저장 시 한글 에러 토스트, anon key로 테이블 직접 조회가 막히는지(RLS).
