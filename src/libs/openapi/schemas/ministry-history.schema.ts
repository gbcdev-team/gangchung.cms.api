import { z } from "zod";
import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import "@/libs/openapi/registry";

export const MinistryHistorySchema = z
  .object({
    id: z
      .string()
      .uuid()
      .openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
    title: z.string().openapi({ example: "사랑의 언어 도장판" }),
    subtitle: z.string().nullable().openapi({ example: "2026년 겨울 수련회" }),
    slug: z.string().openapi({ example: "love-language-stamp" }),
    thumbnail_url: z
      .string()
      .nullable()
      .openapi({ example: "https://example.com/poster.jpg" }),
    category: z.string().nullable().openapi({ example: "수련회" }),
    date_text: z.string().nullable().openapi({ example: "2026.10.24 (토)" }),
    summary: z
      .string()
      .nullable()
      .openapi({ example: "서로의 사랑의 언어를 찾아보는 시간" }),
    buttons: z
      .array(z.object({ label: z.string(), url: z.string().url() }))
      .max(3)
      .openapi({
        example: [{ label: "자세히 보기", url: "https://example.com" }],
      }),
    content: z.string().nullable().openapi({ example: "<p>본문</p>" }),
    sort_order: z.number().int().openapi({ example: 1 }),
    created_at: z
      .string()
      .datetime()
      .openapi({ example: "2026-11-03T00:00:00.000Z" }),
    updated_at: z
      .string()
      .datetime()
      .openapi({ example: "2026-11-03T00:00:00.000Z" }),
  })
  .openapi("MinistryHistory");

export const MinistryHistoryListResponseSchema = z
  .object({
    data: z.array(MinistryHistorySchema),
    total: z.number().int().openapi({ example: 1 }),
    page: z.number().int().openapi({ example: 1 }),
    limit: z.number().int().openapi({ example: 10 }),
  })
  .openapi("MinistryHistoryListResponse");

export const MinistryHistoryDetailResponseSchema = z
  .object({ data: MinistryHistorySchema })
  .openapi("MinistryHistoryDetailResponse");

export function registerMinistryHistoryPaths(reg: OpenAPIRegistry) {
  reg.registerPath({
    tags: ['교회 콘텐츠'],
    method: "get",
    path: "/api/v1/ministry-history",
    summary: "지난 사역 히스토리 목록 조회",
    description:
      "발행된(is_published=true) 글만 sort_order 오름차순으로 반환합니다. is_published 필드는 응답에 포함되지 않습니다.",
    security: [{ ApiKeyAuth: [] }],
    request: {
      query: z.object({
        page: z
          .string()
          .optional()
          .openapi({ example: "1", description: "페이지 번호 (기본값: 1)" }),
        limit: z
          .string()
          .optional()
          .openapi({
            example: "10",
            description: "페이지당 건수 (기본값: 10, 최대 50)",
          }),
      }),
    },
    responses: {
      200: {
        description: "지난 사역 히스토리 목록",
        content: {
          "application/json": { schema: MinistryHistoryListResponseSchema },
        },
      },
      401: {
        description: "인증 실패",
        content: {
          "application/json": { schema: z.object({ error: z.string() }) },
        },
      },
    },
  });

  reg.registerPath({
    tags: ['교회 콘텐츠'],
    method: "get",
    path: "/api/v1/ministry-history/{slug}",
    summary: "지난 사역 히스토리 단건 조회",
    description: "slug로 발행된 글 상세를 반환합니다.",
    security: [{ ApiKeyAuth: [] }],
    request: {
      params: z.object({
        slug: z.string().openapi({ example: "love-language-stamp" }),
      }),
    },
    responses: {
      200: {
        description: "지난 사역 히스토리 상세",
        content: {
          "application/json": { schema: MinistryHistoryDetailResponseSchema },
        },
      },
      401: {
        description: "인증 실패",
        content: {
          "application/json": { schema: z.object({ error: z.string() }) },
        },
      },
      404: {
        description: "글을 찾을 수 없음",
        content: {
          "application/json": { schema: z.object({ error: z.string() }) },
        },
      },
    },
  });
}
