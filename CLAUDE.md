# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

강청 교회 목장(소그룹) 구성원 관리 CMS + 공개 콘텐츠 API. Next.js 14 (App Router) 단일 앱으로, 어드민 UI와 외부에 노출되는 REST API를 함께 서빙한다. package.json 내부명은 `gospelfix-admin-v2`.

## Commands

- Package manager: **yarn 전용** — npm 사용 금지 (`package-lock.json` 생성 금지)
- `yarn dev` — 개발 서버 (포트 3001)
- `yarn build` — 프로덕션 빌드
- `yarn start` — 프로덕션 서버 실행 (포트 3001)
- `yarn lint` — ESLint (`eslint-config-next` + Prettier 통합)
- `yarn pretty` — `src/**/*.{ts,js,tsx,jsx}` Prettier 포맷
- 테스트 스위트는 아직 구성되어 있지 않음 (`.husky/pre-commit`에 `yarn test` 호출이 주석 처리되어 있음)
- `.husky/pre-commit`이 `yarn lint-staged`를 실행하므로 커밋 전 린트/포맷 오류는 로컬에서 먼저 걸러짐

## Architecture

### 두 개의 레이어: 어드민 UI + 동적 공개 API

이 레포는 사실상 두 가지 역할을 한다.

1. **어드민 UI** (`src/app/(admin)/`) — `members`, `profile`, `settings`. 로그인한 관리자가 교회 구성원 데이터를 관리하는 내부 화면.
2. **공개 콘텐츠 API** (`src/app/api/v1/`) — 외부 소비자(다른 서비스)가 `X-API-Key` 헤더로 호출하는 읽기 전용 REST API. 라우트가 리소스별로 하드코딩되어 있지 않고 **단일 동적 라우트** `[resource]/route.ts`, `[resource]/[identifier]/route.ts`로 모든 리소스를 처리한다.

새 공개 API 리소스를 추가할 때 코드를 새로 짤 필요가 없다 — Supabase의 `statkit_content_api_configs` 테이블에 행 하나를 추가하면 끝난다(`src/libs/supabase/queries/content-api-configs.ts`):

- `table_name` — 실제로 조회할 Supabase 테이블
- `resource_slug` — API 경로 (`/api/v1/{slug}`)
- `filter_column`/`filter_value`/`filter_is_bool` — 고정 WHERE 조건 (예: `is_published = true`)
- `identifier_column`/`identifier_type` — 단건 조회 키와 타입(`uuid` | `text`, uuid면 정규식 검증)
- `select_columns`, `order_column`/`order_direction`, `is_enabled`

이 패턴 때문에 "새 리소스 추가"는 거의 항상 **DB 설정 변경**이지 **코드 변경**이 아니다. `src/libs/openapi/schemas/*.schema.ts`와 `registry.ts`/`dynamic-spec.ts`는 이 동적 리소스들에 대한 Swagger 문서(`/api-docs`, `/api/openapi.json`)를 생성하기 위한 레이어로, 실제 라우팅 로직과는 분리되어 있다.

공개 API 인증은 세션이 아니라 `src/libs/openapi/auth.ts`의 `validateApiKey()`가 `X-API-Key` 헤더를 `INTERNAL_API_KEY` env와 단순 비교하는 방식이다.

### 인증은 Supabase Auth — 회원가입 시 직분(role) 선택

`src/middleware.ts`는 `src/libs/supabase/middleware.ts`의 `updateSession()`으로 실제 Supabase 세션을 확인해 `/`, `/sign/in`, 어드민 경로(`/members`, `/profile`, `/settings`), `/api-docs`의 접근을 제어한다(mock-auth 쿠키는 제거됨). 회원가입(`/sign/up`)에서 본인 직분(`초원지기`/`목자`/`목사`/`전도사`, `src/libs/member-roles.ts`의 `PROFILE_ROLES`)을 선택하면 `auth.users` insert 트리거(`handle_new_gangchung_profile`, `supabase/migrations/20261017020000_*.sql`)가 `gangchung_profiles.role`을 채운다. `/api/auth/me`는 `supabase.auth.getUser()` + `getProfileById()`로 실제 프로필을 반환한다.

클라이언트 쪽 인증 상태는 **TanStack Query**로 관리한다(`src/hooks/useAuth.ts`, `src/hooks/useUser.ts`가 `/api/auth/me`를 쿼리 키 `["auth","me"]`로 캐싱). `useAuth()`는 `canManageAllMembers`/`canRunExcelReplace`(role === '목사' | '전도사') 헬퍼를 제공한다. Recoil은 package.json에 의존성이 없고 코드베이스 어디에서도 쓰이지 않는다 — 인증/프로필 접근은 반드시 이 두 훅을 통해서만 한다.

### 권한(RBAC) — 조회는 전체 공개, 쓰기는 역할·트리 스코프로 차등

`gangchung_profiles.role`(`ProfileRole`, `src/types/auth.ts`)은 로그인 가능한 4개 직분(초원지기/목자/목사/전도사)만 허용한다. `목자`/`초원지기`는 `gangchung_profiles.member_id`로 `gangchung_members` 트리의 자기 노드에 연결되고, 쓰기 권한은 그 서브트리로 한정된다(`getDescendantIds`, `src/libs/member-tree.ts` 재사용). 조회(read)는 로그인한 모두에게 공개이며, 생성/수정/삭제 CRUD 단위 권한 판정은 `src/libs/permissions.ts`(`getViewer`, `canCreateMember`, `canUpdateMember`, `canDeleteMember`, `canReplaceAllMembers`)에서 수행하고 `src/app/(admin)/members/actions.ts`·`settings/actions.ts`의 Server Action이 호출한다. 이 프로젝트는 RLS를 쓰지 않으므로(서버 코드 레벨 체크가 보안 모델) 새 쓰기 경로를 추가할 때도 반드시 이 레이어를 통과시켜야 한다. 구성원 엑셀 전체교체(`replace_all_members`)는 `목사`/`전도사`만 가능.

### Supabase 클라이언트 3종 — 용도별로 엄격히 구분

`src/libs/supabase/`:

- `client.ts` — `createBrowserClient` (anon key). Client Component(`"use client"`) 전용.
- `server.ts` — `createServerClient` + `next/headers` 쿠키. Server Component/Route Handler/Server Action 전용.
- `admin.ts` — `createClient` + **service role key**, RLS 우회. 모든 어드민 쿼리(`queries/members.admin.ts`, `queries/content-api-configs.ts`)와 공개 API 라우트가 이걸 쓴다.

**Supabase를 호출하는 코드는 전부 `src/libs/supabase/queries/`에만 작성한다** — 컴포넌트나 라우트 핸들러에서 직접 `.from()`을 호출하지 않는다.

### 구성원 계층 구조 (members 도메인)

`src/types/member.ts`의 `Member`는 `position: '초원지기' | '목자' | '목원' | '임원단' | '목사' | '전도사'`와 자기참조 `parent_id`로 트리를 구성한다 (테이블: `gangchung_members`). `초원지기`/`임원단`/`목사`/`전도사`는 최상위(`parent_id`는 생성 시 강제로 `null`), `목자`/`목원`은 하위(`parent_id` 필수) — 이 버킷 구분은 `src/libs/member-roles.ts`의 `TOP_LEVEL_POSITIONS`와 DB의 `gangchung_members_hierarchy_chk` 제약이 같은 기준을 공유한다. `목자` 레이어가 없는 평평한 최상위 그룹(`임원단`/`목사`/`전도사`)은 어드민 화면(`src/app/(admin)/members/`)에서 아코디언 없이 바로 렌더링한다. UUID 입력은 어디서든 `members.admin.ts`의 UUID 정규식으로 검증 후 사용한다. `position`(구성원 트리 직분)과 `role`(로그인 권한, 위 권한 섹션 참고)은 값 일부를 공유하지만 별개의 개념이다 — `목원`/`임원단`은 `position`에만 존재하고 로그인 `role`로는 쓰이지 않는다.

### 경로 별칭

`@/*` → `./src/*` (tsconfig.json). import는 상대 경로보다 이 별칭을 우선 사용한다.

## 코드 작성 원칙 (.claude/GOSPELFIX.md)

이 레포는 "GFix Craft 결정 사다리"를 코드 작성 전 체크리스트로 쓴다 — 핵심은 **코드를 최대한 적게 쓰는 것**:

1. 지금 당장 필요한가? ("나중에 쓸모있을 것 같아서"는 금지)
2. `src/libs/`(또는 훅)에 이미 있는가?
3. Next.js 내장 기능(Server Actions, Route Handlers)으로 되는가?
4. Supabase가 처리할 수 있는가? (Auth, RLS, Storage, Realtime, Edge Functions — 앱 코드로 재구현 금지)
5. 이미 설치된 패키지로 되는가?
6. 기존 `libs/supabase/`, `libs/openapi/` 패턴을 확장하면 되는가?
7. 10줄 이하 인라인으로 해결되는가?
8. (이 레포는 단일 앱이라 공유 패키지 분리 단계는 해당 없음)
9. 위 전부 아닐 때만 최소 구현

그 외: 추상화는 동일 패턴이 **세 번째** 등장할 때만 추출, `any` 타입 금지, 에러를 조용히 삼키지 않고 처리하거나 전파한다. `yarn add`를 하려는 순간, 새 파일을 3개 이상 만들려는 순간에는 이 사다리로 돌아가 재확인한다.

## 환경 변수

코드에서 참조하는 변수(`.env.local`에 설정, Vercel에는 Production/Preview 각각 등록 필요):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — 브라우저/서버 공용 Supabase 클라이언트 (Supabase Auth 세션도 이 클라이언트로 처리)
- `SUPABASE_SERVICE_ROLE_KEY` — 어드민 클라이언트 (서버 전용, 절대 클라이언트에 노출 금지)
- `INTERNAL_API_KEY` — 공개 API(`/api/v1/*`) `X-API-Key` 검증값

로그인/권한은 이제 Supabase Auth + `gangchung_profiles.role`로 처리하므로 `EMAIL`/`PASSWORD`/`ADMIN_PROFILE_ID` env는 더 이상 쓰지 않는다(제거됨).
