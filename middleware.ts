import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { isTrainerPayload, isTraineePayload } from "@/lib/auth/session-validation";

const encodedKey = new TextEncoder().encode(process.env.SESSION_SECRET || "beat-growth-passport-super-secret-key-change-in-production-2024");

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const trainer = pathname === "/trainer" || pathname.startsWith("/trainer/");
  const entrance = trainer ? "/trainer/login" : "/trainee";
  const token = request.cookies.get(trainer ? "beat_admin_session" : "beat_trainee_session")?.value;
  let valid = false;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, encodedKey, { algorithms: ["HS256"] });
      valid = trainer ? isTrainerPayload(payload) : isTraineePayload(payload);
    } catch { valid = false; }
  }
  if (!valid && pathname !== entrance) {
    return NextResponse.redirect(new URL(entrance, request.url));
  }
  if (valid && (pathname === entrance || pathname === "/trainer")) {
    return NextResponse.redirect(new URL(trainer ? "/trainer/queue" : "/trainee/dashboard", request.url));
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-portal-path", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = { matcher: ["/trainer/:path*", "/trainee/:path*"] };
