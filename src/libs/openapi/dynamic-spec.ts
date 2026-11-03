import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";
import { getAllApiConfigs } from "@/libs/supabase/queries/content-api-configs";
import { registerHealthPaths } from "@/libs/openapi/schemas/health.schema";
import { registerBlogPaths } from "@/libs/openapi/schemas/blog.schema";
import { registerProductPaths } from "@/libs/openapi/schemas/product.schema";
import { registerUserPaths } from "@/libs/openapi/schemas/user.schema";
import { registerOrderPaths } from "@/libs/openapi/schemas/order.schema";
import { registerQuotePaths } from "@/libs/openapi/schemas/quote.schema";
import { registerPortfolioPaths } from "@/libs/openapi/schemas/portfolio.schema";

import { registerMinistryHistoryPaths } from "@/libs/openapi/schemas/ministry-history.schema";

const TYPED_SLUGS: Record<string, (reg: OpenAPIRegistry) => void> = {
  "ministry-history": registerMinistryHistoryPaths,
  blog: registerBlogPaths,
  products: registerProductPaths,
  users: registerUserPaths,
  orders: registerOrderPaths,
  quotes: registerQuotePaths,
  portfolio: registerPortfolioPaths,
};

export async function buildDynamicOpenApiSpec(
  baseUrl = "http://localhost:3001",
) {
  const reg = new OpenAPIRegistry();

  reg.registerComponent("securitySchemes", "ApiKeyAuth", {
    type: "apiKey",
    in: "header",
    name: "X-API-Key",
    description: ".env.local의 INTERNAL_API_KEY 값",
  });

  registerHealthPaths(reg);

  const configs = await getAllApiConfigs();
  for (const config of configs) {
    if (!config.is_enabled) continue;
    const registerFn = TYPED_SLUGS[config.resource_slug];
    if (registerFn) {
      registerFn(reg);
    }
  }

  const generator = new OpenApiGeneratorV31(reg.definitions);

  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "GangChung CMS API",
      version: "1.0.0",
      description: "GangChung 관리자 CMS의 REST API 문서입니다.",
    },
    servers: [{ url: baseUrl, description: "API Server" }],
    // 표시 순서와 그룹 설명. 새 slug를 TYPED_SLUGS에 추가할 때 스키마의 tags를 이 중 하나로 맞춘다.
    tags: [
      { name: "교회 콘텐츠", description: "외부 프론트에 노출되는 교회 공개 콘텐츠" },
      { name: "시스템", description: "서비스 상태 확인" },
      { name: "기타 리소스", description: "그 외 동적 리소스(블로그·상품·주문 등)" },
    ],
  });
}
