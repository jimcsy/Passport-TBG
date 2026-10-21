import { NextRequest, NextResponse } from "next/server";
import { TRAINEE_COOKIE_NAME } from "@/lib/auth/session";

// Cookie changes must happen in a route handler, rather than a server component.
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/trainee", request.url));
  response.cookies.delete(TRAINEE_COOKIE_NAME);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
