# 프로젝트 구조 가이드

원본 문서는 `claude-nextjs-starters`라는 별개의 제네릭 스타터 템플릿(로그인/회원가입이 `app/` 최상위, `components/layout`·`navigation`·`sections` 폴더, `@/lib` alias) 기준이었다. 실제 이 저장소(`statkit.cms.api`)의 구조와 달라 전량 교체했다.

## 🏗️ 전체 프로젝트 구조

```
statkit.cms.api/
├── docs/                          # PRD, ROADMAP, 가이드
├── supabase/
│   ├── migrations/                # 스키마 DDL (SQL Editor에 수동 실행)
│   └── backups/                   # 테이블 데이터 백업
├── src/
│   ├── middleware.ts               # 라우트 보호 + CORS (mock-auth 쿠키 기반)
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── libs/
│   └── types/
├── components.json                 # shadcn/ui 설정 — alias가 @/lib가 아니라 @/libs임에 주의
├── next.config.mjs
├── tailwind.config.ts
└── vercel.json
```

## 📁 src/app/ — App Router

```
src/app/
├── layout.tsx, page.tsx, globals.css
├── (admin)/                    # 관리자 전용 콘텐츠 관리 화면 (라우트 그룹)
│   ├── layout.tsx               # Sidebar를 Server Component에서 렌더링
│   ├── blog/, products/, portfolio/, orders/, quotes/, users/, settings/, profile/
├── api/
│   ├── v1/[resource]/route.ts, v1/[resource]/[identifier]/route.ts  # 동적 공개 API
│   ├── v1/health/route.ts
│   ├── openapi.json/route.ts
│   ├── auth/me/route.ts
│   └── debug-env/route.ts       # 개발 전용, production에서 404
├── api-docs/                    # Swagger UI
├── auth/callback/               # OAuth 콜백
└── sign/in/, sign/up/           # 로그인/회원가입 (❌ `login/`, `signup/`가 아님)
```

## 📁 src/components/ — 두 가지 네이밍 컨벤션이 공존한다

```
src/components/
├── ui/                 # shadcn/ui 원본 — kebab-case 파일 (button.tsx, alert-dialog.tsx, confirm-dialog.tsx)
├── admin/              # 프로젝트 고유 컴포넌트 — PascalCase 폴더 + index.tsx
│   ├── AdminShell/index.tsx
│   ├── Sidebar/index.tsx
│   ├── ApiConfigCard/index.tsx
│   ├── ProductForm/index.tsx, PostForm/index.tsx, PortfolioForm/index.tsx
│   ├── RichEditor/index.tsx
│   └── MobileMenuContext.tsx   # 예외: 폴더 없이 단일 파일
├── providers/QueryProvider.tsx  # react-query Provider
└── swagger/SwaggerUI.tsx
```

새 shadcn 컴포넌트는 `yarn shadcn add <name>`으로 `ui/`에 kebab-case로 추가되고, 새 관리자 전용 컴포넌트는 `admin/PascalCase명/index.tsx` 컨벤션을 따른다. `components/layout/`, `components/navigation/`, `components/sections/` 같은 폴더는 이 프로젝트에 없다 — 필요하면 `admin/` 하위에 만든다.

## 📁 src/libs/, src/hooks/, src/types/

```
src/libs/
├── supabase/
│   ├── client.ts, server.ts, admin.ts, middleware.ts
│   └── queries/                 # 도메인별 쿼리 파일 (posts.ts / posts.server.ts / posts.admin.ts 처럼 클라이언트별 분리)
├── openapi/
│   ├── auth.ts, dynamic-spec.ts, registry.ts, spec.ts
│   └── schemas/                 # 리소스별 zod-to-openapi 스키마
└── utils.ts                     # cn() 헬퍼

src/hooks/
├── useAuth.ts   # react-query 기반 (/api/auth/me 구독)
└── useUser.ts   # 같은 쿼리 캐시를 갱신하는 setProfile 제공

src/types/
├── auth.ts, post.ts, product.ts, portfolio.ts, api.ts
```

`src/store/`(Recoil atoms/selectors) 폴더는 더 이상 존재하지 않는다 — 상태 관리는 전부 react-query로 이전됐다(CLAUDE.md "인증" 섹션 참고).

## 🏷️ 파일 네이밍 컨벤션

- **`src/components/ui/`**: shadcn 원본 그대로 kebab-case (`alert-dialog.tsx`)
- **`src/components/admin/`**: PascalCase 폴더 + `index.tsx` (`ProductForm/index.tsx`)
- **`src/app/`의 페이지**: Next.js 규칙(`page.tsx`, `layout.tsx`, `actions.ts`)을 그대로 따르고, 같은 라우트 폴더 안의 Client Component는 PascalCase 파일(`BlogTable.tsx`, `EditPostForm.tsx`)
- **`src/libs/`, `src/hooks/`, `src/types/`**: camelCase 또는 도메인명 그대로(`useAuth.ts`, `posts.admin.ts`)

## 🔗 경로 별칭 (Path Aliases)

`components.json` 기준 실제 alias — 원본 문서의 `@/lib`는 이 프로젝트에 **존재하지 않는다**:

```typescript
import { Button } from "@/components/ui/button";
import { cn } from "@/libs/utils"; // ❌ @/lib/utils 아님
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/libs/supabase/client";
```

- `@/components` → `src/components`
- `@/libs` → `src/libs` (lib alias)
- `@/libs/utils` → `src/libs/utils.ts` (utils alias)
- `@/components/ui` → `src/components/ui` (ui alias)
- `@/hooks` → `src/hooks`

## 📝 새 파일/폴더 추가 규칙

1. **Supabase 쿼리 추가**: `src/libs/supabase/queries/<도메인>.ts`(브라우저), `.server.ts`(공개 API), `.admin.ts`(CMS 쓰기) 중 용도에 맞는 파일에 — 컴포넌트에 인라인 쿼리 금지(CLAUDE.md 데이터 접근 규칙).
2. **새 관리자 페이지**: `src/app/(admin)/<리소스>/page.tsx` + 필요시 `actions.ts`(뮤테이션 전용) + `<Xxx>Table.tsx`/`<Xxx>Form.tsx`.
3. **새 공개 API 리소스**: 새 라우트 파일을 만들 필요 없이 `statkit_content_api_configs`에 행을 추가하면 기존 동적 핸들러가 처리한다(CLAUDE.md "동적 REST API 토글 시스템" 참고).
4. **새 shadcn 컴포넌트**: `yarn shadcn add <name>` (❌ `npx shadcn@latest add`).

## ✅ 체크리스트

- [ ] Supabase 쿼리를 `queries/`에만 작성했는가
- [ ] `@/libs/utils`(❌ `@/lib/utils`)로 import했는가
- [ ] `admin/` 컴포넌트는 PascalCase 폴더 + `index.tsx`, `ui/` 컴포넌트는 kebab-case인가
- [ ] `'use server'` 파일에 읽기 함수(`getXxx`)를 넣지 않았는가
- [ ] `yarn`만 사용했는가(`npm` 금지)
