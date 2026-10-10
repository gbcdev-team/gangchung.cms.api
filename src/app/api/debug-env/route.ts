import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  return NextResponse.json({
    EMAIL_set: !!process.env.EMAIL,
    PASSWORD_set: !!process.env.PASSWORD,
    NODE_ENV: process.env.NODE_ENV,
  });
}
