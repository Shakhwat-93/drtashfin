import { NextRequest, NextResponse } from "next/server";
import {
  DR_ACCESS_COOKIE,
  DR_REFRESH_COOKIE,
  inspectJwtClaims,
} from "@/lib/auth/session";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";

const PUBLIC_PAGE_PATHS = ["/login", "/reset-password"];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Always allow static assets and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  // 2. Always allow authentication endpoints
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // 3. Check clinician session cookies or Authorization header
  const accessCookie = request.cookies.get(DR_ACCESS_COOKIE)?.value;
  const refreshCookie = request.cookies.get(DR_REFRESH_COOKIE)?.value;
  const authHeader = request.headers.get("authorization");
  const bearerToken =
    authHeader && authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : null;

  const claims = inspectJwtClaims(accessCookie || bearerToken);
  const hasCandidateSession = Boolean(claims.valid || refreshCookie);

  // 4. If already authenticated and visiting /login, redirect to dashboard
  if (pathname === "/login" && claims.valid) {
    const redirectParam = request.nextUrl.searchParams.get("redirect");
    const targetPath =
      redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
        ? redirectParam
        : "/";
    return NextResponse.redirect(new URL(targetPath, request.url));
  }

  // 5. Allow public auth pages
  if (PUBLIC_PAGE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  // 6. Protect API routes (/api/prescriptions/* and /api/supabase/*)
  if (pathname.startsWith("/api/")) {
    const isPublicMedicineRead =
      (request.method === "GET" || request.method === "HEAD") &&
      pathname === "/api/supabase/rest/v1/medicines";

    if (isPublicMedicineRead) {
      return NextResponse.next();
    }

    if (!hasCandidateSession) {
      return NextResponse.json(
        {
          error:
            "Authentication required. Valid clinician session missing.",
        },
        { status: 401, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    return NextResponse.next();
  }

  // 7. Protect all clinical application pages (/, /patients/*, /medicines/*)
  if (!hasCandidateSession) {
    const loginUrl = new URL("/login", request.url);
    const fullPath = `${pathname}${search}`;
    if (fullPath && fullPath !== "/") {
      loginUrl.searchParams.set("redirect", fullPath);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
