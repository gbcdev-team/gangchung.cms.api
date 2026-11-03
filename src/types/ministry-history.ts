import { z } from "zod";

export interface MinistryHistory {
  id: string;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  category: string | null;
  content: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// 클라이언트 폼과 Server Action이 같은 스키마를 공유한다(액션은 공개 POST라 서버 재검증 필수).
export const ministryHistoryFormSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력하세요.").max(200),
  slug: z
    .string()
    .trim()
    .min(1, "슬러그를 입력하세요.")
    .max(100)
    .regex(/^[\p{L}\p{N}-]+$/u, "글자, 숫자, 하이픈(-)만 사용할 수 있습니다."),
  category: z.string().trim().max(100),
  content: z.string().max(500_000),
  is_published: z.boolean(),
});

export type MinistryHistoryFormInput = z.infer<
  typeof ministryHistoryFormSchema
>;
