# 폼 처리 가이드

원본 문서는 Next.js 15.5.3 + React 19(`useActionState`) 기준에 JWT 세션·bcrypt·CSRF 토큰·rate limiting·XHR 파일 업로드 진행률 같은 이 프로젝트와 무관한 보일러플레이트가 대부분이라 전량 걷어내고, 이 프로젝트의 실제 폼 구현 방식으로 다시 썼다.

## 현재 상태: react-hook-form은 설치돼 있지만 실제로는 안 쓰인다

`package.json`의 실제 버전은 `react-hook-form ^7.82.0`, `@hookform/resolvers ^5.4.0`, `zod ^3.22.4`다(원본의 `zod ^4.1.11` 등은 이 프로젝트 기준이 아니다). 이 라이브러리들은 `src/components/ui/form.tsx`(shadcn Form 래퍼)에서만 import되고, `ProductForm`·`PostForm`·`PortfolioForm`·프로필 페이지 등 **실제 폼은 전부 필드별 `useState` + 수동 검증**을 쓴다. 새 폼을 만들 때는 아래 "실제 사용 중인 패턴"을 기본으로 따르고, react-hook-form 채택은 별도 판단이 필요한 전환 작업으로 취급한다.

## 실제 사용 중인 패턴 (프로필 페이지 기준)

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { updateProfile } from "@/libs/supabase/queries/profile";

const schema = z.object({
  full_name: z
    .string()
    .min(1, "이름을 입력해주세요")
    .max(50, "이름은 50자 이하여야 합니다"),
});

export default function ProfilePage() {
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");
    const result = schema.safeParse({ full_name: fullName });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setSaving(true);
    try {
      await updateProfile(/* ... */ result.data.full_name);
      toast.success("저장되었습니다");
    } catch {
      toast.error("저장 중 오류가 발생했습니다");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <button onClick={handleSave} disabled={saving}>
        {saving ? "저장 중..." : "저장"}
      </button>
    </>
  );
}
```

`ProductForm`처럼 필드가 많고 값이 복잡한 폼(옵션 배열, 파일 업로드)은 zod 스키마 대신 필드별 수동 `if` 체크 + `AlertDialog`로 에러를 보여주기도 한다 — 두 방식 다 이 코드베이스에 실존하며, 어느 쪽을 쓸지는 폼의 복잡도로 판단한다.

## Server Action 규칙 (CLAUDE.md의 데이터 접근 규칙과 동일)

`'use server'` 파일에는 뮤테이션 함수만 둔다. 폼 컴포넌트는 이 함수를 props로 받아 호출한다(`ProductForm`의 `onSubmit` prop처럼):

```ts
// actions.ts
'use server';
export async function createProductAction(input: ProductFormInput, status: ProductStatus) {
  return createProduct(input, status); // '@/libs/supabase/queries/products.admin'
}

// page.tsx
'use client';
<ProductForm onSubmit={(input, status) => createProductAction(input, status)} />
```

서버 쪽 재검증은 Server Action 함수 안에서 같은 zod 스키마(또는 타입)로 다시 확인한다 — 클라이언트 검증만 믿지 않는다는 원칙은 원본 문서와 동일하게 유효하다.

## react-hook-form을 새로 도입한다면

기존 폼들과 다른 두 가지 스타일이 공존하게 되므로, 도입 전에 팀 컨벤션으로 확정하는 것을 권장한다. 버전은 실제 설치본 기준:

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const schema = z.object({
  full_name: z.string().min(1, "이름을 입력해주세요"),
});

export function ProfileForm({
  onSubmit,
}: {
  onSubmit: (data: z.infer<typeof schema>) => Promise<void>;
}) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이름</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
```

## 보안 — 이 프로젝트에 실제로 있는 것만

- **CSRF**: Next.js Server Action은 same-origin 요청만 허용하는 자체 보호가 있어 별도 CSRF 토큰 구현이 필요 없다. 원본 문서의 커스텀 CSRF 미들웨어는 이 프로젝트에 없고 만들 계획도 없다.
- **Rate limiting**: 미구현. `/sign/in`의 `signInAction`은 환경변수(`MOCK_EMAIL`/`MOCK_PASSWORD`) 비교만 하는 mock 인증이라(CLAUDE.md "인증 — 현재 상태는 전체가 mock" 참고) 아직 해당 없음. 실 Supabase 인증 전환 시 별도로 검토할 사항이다.
- **서버 재검증**: Server Action 안에서 zod(또는 동등한 타입 체크)로 다시 검증 — 클라이언트 검증은 UX용, 서버 검증이 실제 방어선.

## 체크리스트

- [ ] 폼 상태는 이 폼의 복잡도에 맞는 방식(useState+zod 또는 useState+수동 체크)으로 관리했는가
- [ ] Server Action(`actions.ts`)에는 뮤테이션 함수만 있고, 같은 검증을 서버에서도 수행하는가
- [ ] 에러는 `toast`(sonner) 또는 인라인 메시지로 사용자에게 명확히 표시되는가
- [ ] 로딩 상태(`disabled={saving}`)가 있는가
- [ ] `yarn lint`, `yarn pretty` 통과

## 관련 리소스

- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
