import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const ADMIN_COOKIE_NAME = "beat_admin_session";
const TRAINEE_COOKIE_NAME = "beat_trainee_session";

const SECRET_KEY = process.env.SESSION_SECRET || "beat-growth-passport-super-secret-key-change-in-production-2024";
const encodedKey = new TextEncoder().encode(SECRET_KEY);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Guard Admin Routes
  if (pathname.startsWith("/admin")) {
    const isLoginPage = pathname === "/admin/login";
    const adminToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

    let hasValidAdminSession = false;
    if (adminToken) {
      try {
        await jwtVerify(adminToken, encodedKey, { algorithms: ["HS256"] });
        hasValidAdminSession = true;
      } catch {
        hasValidAdminSession = false;
      }
    }

    // Redirect to login if unauthenticated and trying to access admin pages
    if (!hasValidAdminSession && !isLoginPage) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Redirect to dashboard/queue if already authenticated and trying to access login
    if (hasValidAdminSession && isLoginPage) {
      return NextResponse.redirect(new URL("/admin/queue", request.url));
    }
  }

  // 2. Guard Trainee Passport Mirror
  if (pathname.startsWith("/passport")) {
    const traineeToken = request.cookies.get(TRAINEE_COOKIE_NAME)?.value;
    let hasValidTraineeSession = false;

    if (traineeToken) {
      try {
        await jwtVerify(traineeToken, encodedKey, { algorithms: ["HS256"] });
        hasValidTraineeSession = true;
      } catch {
        hasValidTraineeSession = false;
      }
    }

    if (!hasValidTraineeSession) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/passport/:path*"],
};
