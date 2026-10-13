import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest, NextResponse } from "next/server";
import { proxy } from "../src/proxy";
import {
  inspectJwtClaims,
  applySessionCookies,
  clearSessionCookies,
  DR_ACCESS_COOKIE,
  DR_REFRESH_COOKIE,
} from "../src/lib/auth/session";
import {
  getRateLimitKey,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  clearAllRateLimits,
} from "../src/lib/security/rate-limiter";
import { GET as getPdfRoute } from "../src/app/api/prescriptions/[prescriptionId]/pdf/route";
import {
  GET as getArchiveRoute,
  POST as postArchiveRoute,
} from "../src/app/api/prescriptions/[prescriptionId]/archive/route";
import { GET as getVerifyRoute } from "../src/app/api/prescriptions/[prescriptionId]/verify/route";
import { GET as getVersionsRoute } from "../src/app/api/prescriptions/[prescriptionId]/versions/route";
import { GET as getSessionRoute } from "../src/app/api/auth/session/route";
import { POST as postLoginRoute } from "../src/app/api/auth/login/route";
import { POST as postPasswordRoute } from "../src/app/api/auth/password/route";
import { GET as getMfaRoute } from "../src/app/api/auth/mfa/route";
import {
  GET as getSupabaseGateway,
  POST as postSupabaseGateway,
} from "../src/app/api/supabase/[...path]/route";

function createTestJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.signature`;
}

describe("Phase 13: Doctor Authentication, Route Guards & Security Hardening Suite", () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  describe("1. Next.js 16 Server Proxy (src/proxy.ts) Route Protection", () => {
    it("redirects unauthenticated visitors from clinical dashboard (/) to /login", async () => {
      const req = new NextRequest("https://drtashfin.online/");
      const res = await proxy(req);
      assert.equal(res.status, 307);
      assert.equal(res.headers.get("location"), "https://drtashfin.online/login");
    });

    it("redirects unauthenticated visitors from protected patient profile to /login with redirect query", async () => {
      const req = new NextRequest(
        "https://drtashfin.online/patients/PT-000001/prescriptions/new"
      );
      const res = await proxy(req);
      assert.equal(res.status, 307);
      assert.equal(
        res.headers.get("location"),
        "https://drtashfin.online/login?redirect=%2Fpatients%2FPT-000001%2Fprescriptions%2Fnew"
      );
    });

    it("rejects unauthenticated requests to clinical API routes with 401 JSON", async () => {
      const req = new NextRequest(
        "https://drtashfin.online/api/prescriptions/550e8400-e29b-41d4-a716-446655440000/pdf"
      );
      const res = await proxy(req);
      assert.equal(res.status, 401);
      const body = await res.json();
      assert.match(body.error, /Authentication required/i);
    });

    it("permits public GET requests to medicine catalogue search endpoint", async () => {
      const req = new NextRequest(
        "https://drtashfin.online/api/supabase/rest/v1/medicines?select=*",
        { method: "GET" }
      );
      const res = await proxy(req);
      assert.equal(res.status, 200);
    });

    it("redirects already-authenticated doctor away from /login to dashboard", async () => {
      const validToken = createTestJwt({
        sub: "adabdbb0-2308-405c-aa8b-ae672cf1e923",
        role: "authenticated",
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      const req = new NextRequest("https://drtashfin.online/login", {
        headers: {
          cookie: `${DR_ACCESS_COOKIE}=${validToken}`,
        },
      });
      const res = await proxy(req);
      assert.equal(res.status, 307);
      assert.equal(res.headers.get("location"), "https://drtashfin.online/");
    });
  });

  describe("2. Protected Clinical API Route Handlers (Negative Authorization Tests)", () => {
    const sampleRxId = "550e8400-e29b-41d4-a716-446655440000";

    it("blocks unauthenticated PDF download (GET /api/prescriptions/[id]/pdf)", async () => {
      const req = new NextRequest(
        `https://drtashfin.online/api/prescriptions/${sampleRxId}/pdf`
      );
      const res = await getPdfRoute(req, {
        params: Promise.resolve({ prescriptionId: sampleRxId }),
      });
      assert.equal(res.status, 401);
    });

    it("blocks unauthenticated R2 archival (POST & GET /api/prescriptions/[id]/archive)", async () => {
      const postReq = new NextRequest(
        `https://drtashfin.online/api/prescriptions/${sampleRxId}/archive`,
        { method: "POST" }
      );
      const postRes = await postArchiveRoute(postReq, {
        params: Promise.resolve({ prescriptionId: sampleRxId }),
      });
      assert.equal(postRes.status, 401);

      const getReq = new NextRequest(
        `https://drtashfin.online/api/prescriptions/${sampleRxId}/archive`
      );
      const getRes = await getArchiveRoute(getReq, {
        params: Promise.resolve({ prescriptionId: sampleRxId }),
      });
      assert.equal(getRes.status, 401);
    });

    it("blocks unauthenticated SHA-256 verification (GET /api/prescriptions/[id]/verify)", async () => {
      const req = new NextRequest(
        `https://drtashfin.online/api/prescriptions/${sampleRxId}/verify`
      );
      const res = await getVerifyRoute(req, {
        params: Promise.resolve({ prescriptionId: sampleRxId }),
      });
      assert.equal(res.status, 401);
    });

    it("blocks unauthenticated version history lookup (GET /api/prescriptions/[id]/versions)", async () => {
      const req = new NextRequest(
        `https://drtashfin.online/api/prescriptions/${sampleRxId}/versions`
      );
      const res = await getVersionsRoute(req, {
        params: Promise.resolve({ prescriptionId: sampleRxId }),
      });
      assert.equal(res.status, 401);
    });

    it("blocks unauthenticated session, password change, and MFA management calls", async () => {
      const sessionReq = new NextRequest(
        "https://drtashfin.online/api/auth/session"
      );
      const sessionRes = await getSessionRoute(sessionReq);
      assert.equal(sessionRes.status, 401);

      const pwReq = new NextRequest(
        "https://drtashfin.online/api/auth/password",
        {
          method: "POST",
          body: JSON.stringify({
            action: "change",
            currentPassword: "old",
            newPassword: "NewStrongPassword123!",
          }),
        }
      );
      const pwRes = await postPasswordRoute(pwReq);
      assert.equal(pwRes.status, 401);

      const mfaReq = new NextRequest("https://drtashfin.online/api/auth/mfa");
      const mfaRes = await getMfaRoute(mfaReq);
      assert.equal(mfaRes.status, 401);
    });

    it("blocks unauthenticated patient queries and public self-signup on /api/supabase gateway", async () => {
      const patientReq = new NextRequest(
        "https://drtashfin.online/api/supabase/rest/v1/patients?select=*"
      );
      const patientRes = await getSupabaseGateway(patientReq, {
        params: Promise.resolve({ path: ["rest", "v1", "patients"] }),
      });
      assert.equal(patientRes.status, 401);

      const signupReq = new NextRequest(
        "https://drtashfin.online/api/supabase/auth/v1/signup",
        {
          method: "POST",
          body: JSON.stringify({
            email: "attacker@example.com",
            password: "Password123!",
          }),
        }
      );
      const signupRes = await postSupabaseGateway(signupReq, {
        params: Promise.resolve({ path: ["auth", "v1", "signup"] }),
      });
      assert.equal(signupRes.status, 403);
    });
  });

  describe("3. Brute-Force Rate Limiting & Abuse Protection", () => {
    it("locks out login attempts after 5 consecutive failures and returns 429 with Retry-After", async () => {
      const ip = "203.0.113.42";
      const email = "drtashfinahmed@gmail.com";
      const key = getRateLimitKey(ip, "doctor_login", email);

      for (let i = 0; i < 5; i++) {
        recordFailedAttempt(key, 5, 15 * 60 * 1000);
      }

      const check = checkRateLimit(key, 5, 15 * 60 * 1000);
      assert.equal(check.allowed, false);
      assert.equal(check.remainingAttempts, 0);
      assert.ok(check.retryAfterSeconds > 0);

      // Verify login route enforces 429 lockout
      const req = new NextRequest("https://drtashfin.online/api/auth/login", {
        method: "POST",
        headers: {
          "x-forwarded-for": ip,
          "content-type": "application/json",
        },
        body: JSON.stringify({ email, password: "wrong-password" }),
      });

      const res = await postLoginRoute(req);
      assert.equal(res.status, 429);
      assert.ok(res.headers.get("Retry-After"));

      // Reset clears lockout
      resetRateLimit(key);
      assert.equal(checkRateLimit(key, 5, 15 * 60 * 1000).allowed, true);
    });
  });

  describe("4. JWT Inspection & HttpOnly Session Cookie Hardening", () => {
    it("rejects expired JWTs and anon role tokens in inspectJwtClaims", () => {
      const expiredJwt = createTestJwt({
        sub: "user-1",
        role: "authenticated",
        exp: Math.floor(Date.now() / 1000) - 60,
      });
      const expiredCheck = inspectJwtClaims(expiredJwt);
      assert.equal(expiredCheck.valid, false);
      assert.equal(expiredCheck.expired, true);

      const anonJwt = createTestJwt({
        role: "anon",
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      assert.equal(inspectJwtClaims(anonJwt).valid, false);
    });

    it("applies HttpOnly, SameSite=lax, and Secure flags on HTTPS responses and clears on logout", () => {
      const req = new NextRequest("https://drtashfin.online/api/auth/login", {
        headers: { "x-forwarded-proto": "https" },
      });
      const res = NextResponse.json({ ok: true });

      applySessionCookies(res, req, {
        accessToken: "access-token-123",
        refreshToken: "refresh-token-456",
        expiresIn: 3600,
      });

      const setCookieHeader = res.headers.get("set-cookie") || "";
      assert.match(setCookieHeader, /dr_access_token=access-token-123/);
      assert.match(setCookieHeader, /HttpOnly/i);
      assert.match(setCookieHeader, /SameSite=lax/i);
      assert.match(setCookieHeader, /Secure/i);

      clearSessionCookies(res, req);
      const clearedCookie = res.cookies.get(DR_ACCESS_COOKIE);
      const clearedRefresh = res.cookies.get(DR_REFRESH_COOKIE);
      assert.equal(clearedCookie?.value, "");
      assert.equal(clearedRefresh?.value, "");
    });
  });
});
