# Next.js 14.2.3 개발 지침

원본 문서는 Next.js 15.5.3 기준이었다. 이 프로젝트는 `package.json`에 고정된 **Next.js 14.2.3**이므로, Next 15에서만 존재하는 API(`unauthorized()`/`forbidden()`, 미들웨어 Node.js 런타임 기본값, Turbopack 실험 설정)는 전부 제거하고 이 프로젝트에서 실제로 성립하는 내용만 남겼다.

## 🚀 필수 규칙

### App Router — Pages Router 금지

```
src/app/
├── layout.tsx
├── page.tsx
├── (admin)/          # 라우트 그룹 — 실제로 이 프로젝트가 쓰는 구조
│   ├── layout.tsx
│   └── blog/page.tsx
└── api/
```

### Server Components 우선

이 프로젝트의 모든 `(admin)/*/page.tsx`는 `async function` Server Component로, `queries/` 레이어를 직접 호출한다. 상호작용이 필요한 부분만 별도 파일로 분리해 `'use client'`를 붙인다.

### params / searchParams / cookies() / headers() — 이 프로젝트는 아직 동기값이다

⚠️ **Next 15부터 `params`/`searchParams`/`cookies()`/`headers()`가 Promise가 됐지만, Next 14.2.3인 이 프로젝트의 페이지 컴포넌트는 여전히 동기값이다.** 실제 코드 예시(`src/app/(admin)/blog/[id]/edit/page.tsx`):

```tsx
// ✅ 이 프로젝트의 실제 패턴 — params는 Promise가 아니다
export default async function EditBlogPostPage({
  params,
}: {
  params: { id: string };
}) {
  const post = await getPostByIdAdmin(params.id); // params.id를 바로 사용, await params 아님
}
```

```ts
// src/app/api/auth/me/route.ts — cookies()도 동기 호출
const cookieStore = cookies();
const isMock = cookieStore.get("mock-auth")?.value === "true";
```

단, `src/app/api/v1/[resource]/route.ts` 같은 **Route Handler는 이미 `params: Promise<{ resource: string }>`로 타입을 맞추고 `await params`로 접근**하는 선제 대응 패턴을 쓰고 있다. 새 Route Handler를 추가할 때는 이 컨벤션(Route Handler는 async params, 일반 페이지는 sync params)을 그대로 따른다 — Next 15로 올릴 때 Route Handler 쪽은 이미 준비돼 있다.

### Typed Routes

`next.config.mjs`에 `experimental.typedRoutes`가 설정돼 있지 않다 — 이 프로젝트는 Typed Routes를 쓰지 않는다. `<Link href="...">`는 일반 문자열 경로로 작성한다.

## ✅ 이 프로젝트에 실제로 있는 것

### Streaming과 Suspense

무거운 데이터(예: 대시보드 통계)를 나중에 추가한다면 `Suspense`로 감싸 빠른 콘텐츠를 먼저 렌더링하는 패턴을 쓸 수 있다 — 아직 이 프로젝트 어디에서도 쓰이지 않지만 App Router 표준 패턴이라 그대로 유효하다.

### 캐싱 전략 (`revalidate`, `revalidateTag`)

`src/app/api/v1/[resource]/route.ts`, `.../[identifier]/route.ts`는 `export const dynamic = 'force-dynamic'`으로 캐시를 끄고 항상 최신 DB 상태를 반영한다 — `statkit_content_api_configs`의 `is_enabled` 토글이 즉시 반영돼야 하므로 의도적인 선택이다. 새 공개 API 라우트를 추가할 때도 이 방식을 따른다.

## ⚠️ 이 프로젝트에 아직 없는 것 (원본 문서와의 차이)

- **`after()` API** (`next/server`): Next 14의 `experimental.after` 플래그가 `next.config.mjs`에 설정돼 있지 않다 — 이 프로젝트에서는 쓸 수 없다.
- **`unauthorized()`/`forbidden()`** (`next/server`): Next 15 전용. 이 프로젝트는 미들웨어에서 직접 `NextResponse.json({ error: ... }, { status: 401 })`을 반환한다(`src/app/api/auth/me/route.ts`, `src/libs/openapi/auth.ts`의 `validateApiKey()`).
- **미들웨어 Node.js 런타임**: `src/middleware.ts`에 `runtime: 'nodejs'` 설정이 없다 — Next 14 기본값인 Edge 런타임으로 동작 중이다. Node.js 전용 API(`crypto` 등)를 미들웨어에서 쓰려면 먼저 런타임 설정을 추가해야 한다.
- **Turbopack 실험 설정**: `next.config.mjs`에 `experimental.turbo` 없음.

## 🔄 Route Groups — 이 프로젝트의 실제 사용

```
src/app/
├── (admin)/       # 관리자 전용 콘텐츠 관리 화면 — layout.tsx가 mock-auth 쿠키로 이중 보호
│   ├── blog/, products/, portfolio/, orders/, quotes/, users/, settings/, profile/
├── api/v1/[resource]/, api/openapi.json/   # 공개 REST API
├── api-docs/      # Swagger UI
├── auth/callback/ # OAuth 콜백
└── sign/in/, sign/up/
```

Parallel Routes(`@slot`), Intercepting Routes(`(.)`)는 App Router 표준 기능으로 이 프로젝트에서도 쓸 수 있지만 현재는 쓰이지 않는다 — 모달을 라우트 레벨로 만들 필요가 생기면 도입을 검토한다.

## ❌ 금지 사항

```tsx
// ❌ 금지: 불필요한 'use client'
"use client";
export default function SimpleComponent({ title }: { title: string }) {
  return <h1>{title}</h1>; // 상태/이벤트 핸들러 없음 — Server Component로 유지해야 함
}

// ❌ 금지: 클라이언트에서 서버 전용 모듈(admin.ts 등 service_role 클라이언트) 직접 import
("use client");
import { createAdminClient } from "@/libs/supabase/admin"; // 빌드 에러 또는 키 유출
```

- Pages Router(`pages/`, `getServerSideProps`, `getStaticProps`) 사용 금지.
- Supabase 쿼리는 컴포넌트/페이지에 인라인으로 쓰지 않는다 — `src/libs/supabase/queries/`만 통한다(CLAUDE.md 데이터 접근 규칙).

## 코드 품질 체크리스트

`package.json`에 실제로 정의된 스크립트만 실행한다(`typecheck`, `format:check`, `check-all`은 이 프로젝트에 없음):

```bash
yarn lint     # ESLint
yarn pretty   # Prettier 포맷
yarn build    # 빌드 (타입 에러도 이 단계에서 함께 잡힘)
```
