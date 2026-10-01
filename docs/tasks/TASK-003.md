# Task 003: 공통 컴포넌트 현황

> 원본 파일은 이벤트/참여자 앱(EventCard, ParticipantCard, 더미 데이터 등)을 위한 기획 문서였고 statkit.cms.api(헤드리스 CMS 관리자)와는 무관해 전량 교체했다. `docs/TECH-STACK-PRIORITY.md`(범용 기술스택 선택 원칙)와는 주제가 달라 병합하지 않았다.

## 설치된 shadcn/ui 컴포넌트

`components.json` 기준 `baseColor: neutral`, `style: default`, alias는 `@/components/ui`(ui), `@/libs`(lib), `@/libs/utils`(utils), `@/hooks`(hooks) — `@/lib`가 아니라 `@/libs`인 점 주의.

| 컴포넌트                    | 파일                                                                             |
| --------------------------- | -------------------------------------------------------------------------------- |
| Alert Dialog                | `src/components/ui/alert-dialog.tsx`                                             |
| Button                      | `src/components/ui/button.tsx`                                                   |
| Card                        | `src/components/ui/card.tsx`                                                     |
| Confirm Dialog              | `src/components/ui/confirm-dialog.tsx`                                           |
| Dialog                      | `src/components/ui/dialog.tsx`                                                   |
| Form (react-hook-form 래퍼) | `src/components/ui/form.tsx`                                                     |
| Input                       | `src/components/ui/input.tsx`                                                    |
| Label                       | `src/components/ui/label.tsx`                                                    |
| Sonner (Toast)              | `src/components/ui/sonner.tsx`, `src/app/layout.tsx`에 `<Toaster />` 마운트 완료 |

**미설치**: Avatar, Select, Skeleton, Textarea. 아바타는 `<img>` 태그로 직접 구현(`ProfilePage`), 셀렉트는 네이티브 `<select>`(`ProductForm`의 카테고리 선택), 로딩 스켈레톤은 프로젝트 어디에도 없다(리스트 로딩 상태 UI 미구현). 필요해지면 그때 `yarn shadcn add <component>`로 추가한다 — `docs/TECH-STACK-PRIORITY.md` 원칙 2(기능별 의존성은 필요할 때 추가)를 따른다.

## 프로젝트 고유 관리자 컴포넌트

이벤트/참여자가 아니라 이 프로젝트의 실제 도메인(블로그·상품·포트폴리오·주문·견적·회원) 기준. 폴더는 `PascalCase/index.tsx` 컨벤션(shadcn `ui/`의 kebab-case 파일과 구분됨).

```
src/components/admin/
├── AdminShell/          # 관리자 레이아웃 셸
├── Sidebar/             # 반응형 사이드바 (모바일 드로어 + PC 고정)
├── MobileMenuContext.tsx  # Sidebar ↔ AdminShell 모바일 메뉴 상태 공유 (React Context)
├── EmptyState/          # 빈 목록 상태 UI
├── ApiConfigCard/       # /settings — 리소스별 REST API 노출 토글 카드
├── ApiPagination/       # 목록 페이지네이션
├── PostForm/, ProductForm/, PortfolioForm/  # 콘텐츠 작성 폼 (react-hook-form 미사용, 아래 참고)
├── RichEditor/          # Tiptap 기반 리치 텍스트 에디터
└── UserCard/            # 회원 카드
```

## 폼 구현 패턴 — 실제로는 react-hook-form을 쓰지 않는다

`react-hook-form`, `@hookform/resolvers`, `zod`는 의존성으로 설치돼 있고 `src/components/ui/form.tsx`가 이를 감싸지만, **실제 폼(`ProductForm`, `PostForm`, `PortfolioForm`, 프로필 페이지)은 전부 필드별 `useState` + 수동 검증**을 쓰고 있고 `form.tsx`를 import하는 곳은 아직 없다. 새 폼을 만들 때 기존 컨벤션(수동 `useState`)을 따를지, `<Form>` 컴포넌트로 전환할지는 작업 시점에 판단한다 — 현재 코드베이스에 두 방식이 섞여 있지 않으니 새로 도입한다면 기존 폼도 함께 맞추는 것을 고려할 것.

## 더미 데이터 / Storybook

이 프로젝트는 실제 Supabase에 연결돼 있으므로 더미 데이터 생성기나 Storybook 페이지가 없고 필요하지도 않다 — 원본 태스크의 `lib/data/` 관련 항목은 전부 제외했다.
