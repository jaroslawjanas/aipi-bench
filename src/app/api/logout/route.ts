import { NextResponse } from "next/server";
import { clearSessionCookieString } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", clearSessionCookieString());
  return response;
}
