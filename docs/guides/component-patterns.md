# 컴포넌트 패턴 가이드

이 문서는 이 프로젝트(Next.js 14.2.3 App Router + React 18)에서 재사용 가능한 컴포넌트를 작성하는 패턴을 제공한다. (원본은 Next.js 15.5.3 + React 19 기준이었으나 이 프로젝트의 실제 `package.json` 버전에 맞춰 수정함 — React 19 전용 API인 `useActionState`, `useFormStatus` 예시는 전부 제거하고 이 프로젝트가 실제로 쓰는 패턴으로 교체했다.)

## 🧩 기본 설계 원칙

### 1. 단일 책임 원칙 (Single Responsibility)

```tsx
// ✅ 각 컴포넌트가 하나의 명확한 책임
export function UserAvatar({ user, size = "md" }) {
  return (
    <div className={cn("rounded-full overflow-hidden", avatarSizes[size])}>
      {user.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatar_url}
          alt={user.full_name ?? ""}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{user.full_name?.[0]?.toUpperCase()}</span>
      )}
    </div>
  );
}

// ❌ 여러 책임이 섞인 컴포넌트 — 아바타 + 상태 + 폼 필드 + 저장 버튼이 한 컴포넌트에 (실제로 ProfilePage가 이 경계를 명확히 나누지 않은 예이니, 새로 쪼갤 때 참고)
```

### 2. 컴포지션 우선 (Composition over Inheritance)

`src/components/ui/card.tsx`(shadcn)가 실제로 이 패턴이다: `Card`/`CardHeader`/`CardContent`로 조합해서 쓴다. 상속은 React에 부적합하므로 쓰지 않는다.

## 🔄 Server vs Client Components

### Server Components (기본값)

```tsx
// src/app/(admin)/blog/page.tsx — 실제 패턴: Server Component가 queries/ 레이어를 직접 호출
export default async function BlogPage() {
  const posts = await getAllPosts(); // '@/libs/supabase/queries/posts.admin'
  return posts.length === 0 ? (
    <EmptyState message="등록된 소식이 없습니다" />
  ) : (
    <BlogTable posts={posts} />
  );
}
```

### Client Components ('use client' 필요) — 이 프로젝트의 실제 폼/버튼 패턴

React 19의 `useActionState`/`useFormStatus`는 이 프로젝트(React 18)에서 쓸 수 없다. 대신 이 프로젝트는 **필드별 `useState` + 수동 검증 + `loading` state**로 제출 상태를 관리한다 (`src/components/admin/ProductForm/index.tsx` 실제 패턴):

```tsx
"use client";

export default function ProductForm({
  onSubmit,
}: {
  onSubmit: (input: Input) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const handleSave = async () => {
    if (!name.trim()) {
      setAlertMessage("필수 입력값을 확인해주세요.");
      return;
    }
    setLoading(true);
    try {
      await onSubmit({ name });
    } catch (err) {
      setAlertMessage(
        err instanceof Error ? err.message : "저장에 실패했습니다.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleSave} disabled={loading}>
      {loading ? "저장 중..." : "저장"}
    </button>
  );
}
```

삭제 후 목록 갱신은 `router.refresh()`(Server Component 재실행), 저장 후 이동은 `router.push()`를 쓴다 — `redirect()`(next/navigation)를 Server Action 안에서 직접 호출하는 패턴도 로그인(`signInAction`)에서 쓰인다.

### Server-Client 경계 설정

```
page.tsx (async Server Component)  → queries/ 레이어에서 직접 조회
  └── XxxTable.tsx ('use client')  → 삭제 버튼 클릭 → Server Action 호출 → router.refresh()
  └── XxxForm.tsx  ('use client')  → 필드별 useState → Server Action 호출 → router.push()
```

## 🎯 Props 설계 패턴

### Props Interface 정의

일반 원칙은 그대로 유효하다:

```tsx
interface ButtonProps {
  children: React.ReactNode;
  variant?:
    "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
  className?: string;
}
```

### 컴포넌트 변형 (Variants) — CVA

`class-variance-authority`가 실제 의존성이며 `src/components/ui/button.tsx`가 이 패턴을 쓴다:

```tsx
import { cva, type VariantProps } from "class-variance-authority";

const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm",
  {
    variants: {
      variant: {
        default: "border-border",
        outline: "border-2",
        ghost: "border-transparent shadow-none",
      },
      size: { sm: "p-4", md: "p-6", lg: "p-8" },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);
```

### 컴파운드 컴포넌트 패턴

Context로 여러 하위 컴포넌트가 상태를 공유하는 패턴 — 이 프로젝트에서는 `MobileMenuContext.tsx`(Sidebar ↔ AdminShell 간 모바일 메뉴 열림 상태 공유)가 실제 사례다. Accordion류 UI를 새로 만들 때도 같은 구조를 따른다.

## ⚡ 성능 최적화 패턴

### 메모이제이션

`memo`/`useMemo`/`useCallback`은 필요할 때만 쓴다 — 이 프로젝트의 admin 폼들은 데이터 규모가 작아(콘텐츠 목록 페이지네이션 단위) 대부분 메모이제이션 없이 충분하다. 리스트가 실제로 커지고 렌더링 비용이 측정됐을 때 도입한다.

### 지연 로딩 (Lazy Loading)

`SwaggerUI`(`src/components/swagger/SwaggerUI.tsx`)처럼 무거운 서드파티 컴포넌트는 `next/dynamic`으로 분리하는 것을 고려한다. `react-window` 같은 가상화 라이브러리는 현재 의존성에 없다 — 리스트가 실제로 수천 건 단위가 되기 전까지는 도입하지 않는다.

## 🛡️ 타입 안전성 패턴

제네릭 컴포넌트, 조건부 타입 패턴은 프레임워크 버전과 무관하게 그대로 유효하다. 타입은 `src/types/`(예: `product.ts`, `post.ts`, `auth.ts`)에 도메인별로 분리해 정의한다.

## 🚫 안티패턴 및 금지사항

```tsx
// ❌ 너무 많은 props, 깊은 props drilling, 500줄 넘는 거대 컴포넌트, 인라인 객체/함수 매 렌더링 생성 — 원본 예시와 동일하게 지양
```

`ProductForm`처럼 필드가 많은 폼도 렌더링 JSX는 섹션별 주석으로 나누되, 상태 관리 로직이 300줄을 넘기면 커스텀 훅으로 분리하는 것을 고려한다.

## ✅ 컴포넌트 작성 체크리스트

- [ ] 단일 책임 원칙 준수, 적절한 컴포지션 활용
- [ ] Props 인터페이스 정의, 필요 시 CVA로 variant 관리
- [ ] Server Component 우선 고려, `'use client'`는 상호작용이 실제로 필요한 최소 범위로
- [ ] Supabase 쿼리는 컴포넌트에 직접 쓰지 않고 `src/libs/supabase/queries/`만 통해서 (데이터 접근 규칙 — CLAUDE.md 참고)
- [ ] `yarn lint`, `yarn pretty` 통과
