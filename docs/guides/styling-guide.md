# 스타일링 가이드

TailwindCSS v4 + shadcn/ui 기준. `prettier-plugin-tailwindcss`는 이 프로젝트 `devDependencies`에 없다 — 클래스 자동 정렬은 되지 않으니 원본 문서의 "Prettier가 자동 정렬" 설명은 삭제했다. 포맷은 `yarn pretty`(plain Prettier)만 수행한다.

## 🎨 기술 스택 개요

- **TailwindCSS v4** (`@tailwindcss/postcss`)
- **shadcn/ui**: `baseColor: neutral`, `style: default` (`components.json` 실제 설정)
- **next-themes**: 다크모드 (`attribute="class"`, `src/app/layout.tsx`에서 `defaultTheme="light"`로 설정)
- **tw-animate-css**: 애니메이션 유틸리티
- **CSS 변수**: `src/app/globals.css`에 shadcn 기본 oklch 팔레트가 정의돼 있음 — 단, 아래 참고

## ⚠️ 이 프로젝트의 실제 색상 컨벤션 — CSS 변수를 쓰지 않는다

`globals.css`에는 `--background`, `--foreground`, `--primary` 같은 shadcn 기본 CSS 변수가 전부 정의돼 있고 `bg-background`/`text-foreground` 같은 시맨틱 클래스도 쓸 수 있는 상태다. **하지만 실제 관리자 화면 코드(`ProfilePage`, `ProductForm`, `BlogPage` 등)는 이 시맨틱 토큰을 쓰지 않고, 하드코딩된 그레이스케일 Tailwind 클래스 + 명시적 `dark:` variant 조합을 쓴다.** 새 컴포넌트를 만들 때도 기존 화면과의 일관성을 위해 이 컨벤션을 따른다:

```tsx
// ✅ 이 프로젝트의 실제 패턴
<div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-6">
  <h1 className="text-gray-900 dark:text-gray-100">제목</h1>
  <p className="text-gray-400 dark:text-gray-500">보조 텍스트</p>
</div>

// ❌ shadcn 시맨틱 토큰 — 문법적으로는 동작하지만 이 프로젝트의 기존 화면과 일관성이 깨진다
<div className="bg-background text-foreground">
```

**필수 다크모드 매핑표** (`.claude/memory/conversation-insights.md`와 동일):

| 라이트                                | 다크                   |
| ------------------------------------- | ---------------------- |
| `bg-white`                            | `dark:bg-gray-800`     |
| `bg-gray-100` / `bg-gray-50`          | `dark:bg-gray-700`     |
| `border-gray-100` / `border-gray-200` | `dark:border-gray-700` |
| `text-gray-900`                       | `dark:text-gray-100`   |
| `text-gray-700`                       | `dark:text-gray-300`   |
| `text-gray-400`                       | `dark:text-gray-500`   |

**메인 색상은 검정(#000)**, CSS 변수의 `--primary`가 아니다:

```tsx
<button className="bg-black dark:bg-white text-white dark:text-black hover:opacity-80 disabled:opacity-50 rounded-lg">
  저장
</button>
```

`input` 요소는 `border`만 다크 대응하면 내부 배경이 브라우저 기본 흰색으로 남는다 — `dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500`까지 명시해야 한다(`ProductForm`의 `INPUT_CLASS` 참고).

### next-themes hydration 가드

`theme` 값은 SSR에서 `undefined`다. 테마별 활성 표시가 있다면 `mounted` state로 감싼다:

```tsx
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
// 사용: mounted && theme === value
```

## 🚀 TailwindCSS v4 사용 규칙

인라인 스타일(`style={{ }}`) 금지, 유틸리티 클래스 우선은 원본 문서와 동일하게 유효하다. 클래스 조합은 `cn()`(`@/libs/utils`, `clsx` + `tailwind-merge` 래퍼)으로 한다:

```tsx
import { cn } from "@/libs/utils";

<div
  className={cn(
    "rounded-lg border",
    isActive && "bg-black text-white",
    className,
  )}
/>;
```

### 반응형 — 모바일 우선

`ProductForm`의 실제 레이아웃 패턴:

```tsx
<div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
  {/* 모바일: 세로 스택 + 상단 액션바 / lg 이상: 폼 + 우측 sticky 액션 패널 */}
</div>
```

## 🎭 shadcn/ui 컴포넌트

새 컴포넌트 추가는 `yarn shadcn add <name>`(❌ `npx shadcn@latest add` — 이 프로젝트는 yarn 전용). 설치된 컴포넌트 목록은 `docs/tasks/TASK-003.md` 참고.

```tsx
import { Button } from '@/components/ui/button';

<Button variant="outline">아웃라인 버튼</Button>
<Button size="sm">작은 버튼</Button>
```

기존 컴포넌트는 `cn()`으로 확장하고, shadcn 컴포넌트를 두고 처음부터 새로 만들지 않는다.

## 🚫 금지사항

```tsx
// 인라인 스타일
<div style={{ backgroundColor: 'red' }}>

// !important 남용
<div className="!text-red-500 !bg-blue-500">

// 다크모드 누락 — 이 프로젝트에서 가장 흔한 실수
<div className="bg-white text-black">  {/* dark: 변형 없음 */}
```

## ✅ 체크리스트

- [ ] 하드코딩된 그레이스케일 + `dark:` 변형 컨벤션을 따랐는가(shadcn 시맨틱 토큰 아님)
- [ ] `input`/`textarea`/`select`까지 다크모드 배경·텍스트·placeholder를 전부 지정했는가
- [ ] 메인 액션 색상은 `bg-black dark:bg-white`인가
- [ ] `cn()`으로 클래스를 조합했는가
- [ ] 모바일 우선 반응형(`flex-col lg:flex-row` 등)을 적용했는가
- [ ] `yarn shadcn add`로 컴포넌트를 추가했는가
