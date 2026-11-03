import { z } from "zod";

export interface MinistryHistoryButton {
  label: string;
  url: string;
}

export interface MinistryHistory {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  thumbnail_url: string | null;
  category: string | null;
  // 카드에 그대로 표시하는 자유 텍스트(예: "2026.10.24 (토)", "2026.06.28 - 07.04")
  date_text: string | null;
  summary: string | null;
  buttons: MinistryHistoryButton[];
  content: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const MAX_HISTORY_BUTTONS = 3;

// 소비 측에서 href로 쓰일 수 있어 http(s)만 허용한다(javascript: 등 차단).
const httpUrl = z
  .string()
  .trim()
  .min(1, "링크를 입력하세요.")
  .max(2000)
  .regex(
    /^https?:\/\/\S+$/i,
    "http:// 또는 https://로 시작하는 URL을 입력하세요.",
  );

// 클라이언트 폼과 Server Action이 같은 스키마를 공유한다(액션은 공개 POST라 서버 재검증 필수).
export const ministryHistoryFormSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력하세요.").max(200),
  subtitle: z.string().trim().max(200),
  slug: z
    .string()
    .trim()
    .min(1, "슬러그를 입력하세요.")
    .max(100)
    .regex(/^[\p{L}\p{N}-]+$/u, "글자, 숫자, 하이픈(-)만 사용할 수 있습니다."),
  category: z.string().trim().max(100),
  date_text: z.string().trim().max(100),
  summary: z.string().trim().max(500),
  buttons: z
    .array(
      z.object({
        label: z.string().trim().min(1, "버튼 이름을 입력하세요.").max(30),
        url: httpUrl,
      }),
    )
    .max(
      MAX_HISTORY_BUTTONS,
      `버튼은 최대 ${MAX_HISTORY_BUTTONS}개까지 추가할 수 있습니다.`,
    ),
  is_published: z.boolean(),
});

export type MinistryHistoryFormInput = z.infer<
  typeof ministryHistoryFormSchema
>;
