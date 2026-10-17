import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/libs/supabase/middleware";

const ADMIN_PATHS = ["/members", "/profile", "/settings"];

function isPublicApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/v1/") || pathname === "/api/openapi.json";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CORS Preflight — 공개 API 경로에 한해서만 처리
  if (request.method === "OPTIONS") {
    if (!isPublicApiPath(pathname))
      return new NextResponse(null, { status: 405 });

    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Accept",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // 공개 API 경로는 세션 갱신 없이 CORS 헤더만 주입 — X-API-Key 인증이 보안 레이어
  if (isPublicApiPath(pathname)) {
    const response = NextResponse.next();
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, X-API-Key, Accept",
    );
    return response;
  }

  const { supabaseResponse, user } = await updateSession(request);
  const isAuthenticated = user !== null;

  const redirectWithSession = (url: string) => {
    const response = NextResponse.redirect(new URL(url, request.url));
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie);
    });
    return response;
  };

  // /api/auth/me — 인증된 사용자만 접근 가능
  if (pathname === "/api/auth/me" && !isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 루트 접속 → 인증 여부에 따라 분기
  if (pathname === "/") {
    return redirectWithSession(isAuthenticated ? "/members" : "/sign/in");
  }

  // 이미 로그인된 상태에서 /sign/in 접속 → /members로 이동
  if (pathname === "/sign/in" && isAuthenticated) {
    return redirectWithSession("/members");
  }

  // API 문서 페이지 — 로그인된 관리자만 접근 가능
  if (pathname === "/api-docs" || pathname.startsWith("/api-docs/")) {
    if (!isAuthenticated) {
      return redirectWithSession("/sign/in");
    }
    return supabaseResponse;
  }

  // 어드민 경로 미인증 접근 차단
  const isAdminPath = ADMIN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (isAdminPath && !isAuthenticated) {
    return redirectWithSession("/sign/in");
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/",
    "/sign/in",
    "/api/auth/me",
    "/api/v1/:path*",
    "/api/openapi.json",
    "/api-docs/:path*",
    "/members/:path*",
    "/profile/:path*",
    "/settings/:path*",
  ],
};
