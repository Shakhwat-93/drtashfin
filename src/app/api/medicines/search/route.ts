import { NextRequest, NextResponse } from "next/server";
import { requireDoctorAuth, applySessionCookies } from "@/lib/auth/session";
import {
  CLINICAL_API_SECURITY_HEADERS,
} from "@/lib/security/api-security";
import {
  checkRateLimit,
  getRateLimitKey,
} from "@/lib/security/rate-limiter";
import {
  HybridMedicineSearchService,
  sanitizeMedicineSearchQuery,
} from "@/lib/medicine-search";
import { getMedicineRepository } from "@/lib/data";

export const runtime = "nodejs";

const MAX_SEARCHES_PER_MINUTE = 60;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    // 1. Enforce Doctor Authentication
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    // 2. Sliding-Window Rate Limiting
    const clientIp =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";
    const rateLimitKey = getRateLimitKey(
      clientIp,
      "medicine-search",
      auth.user?.id || "doctor"
    );

    const rateCheck = checkRateLimit(
      rateLimitKey,
      MAX_SEARCHES_PER_MINUTE,
      RATE_LIMIT_WINDOW_MS
    );

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: "Too many search requests. Please slow down.",
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            ...CLINICAL_API_SECURITY_HEADERS,
            "Retry-After": String(rateCheck.retryAfterSeconds),
          },
        }
      );
    }

    // 3. Parse & Validate Query Parameters
    const { searchParams } = request.nextUrl;
    const rawQuery = searchParams.get("q") || searchParams.get("query") || "";
    const query = sanitizeMedicineSearchQuery(rawQuery);
    const dosageForm = searchParams.get("dosageForm") || undefined;
    const manufacturer = searchParams.get("manufacturer") || undefined;
    const limitParam = parseInt(searchParams.get("limit") || "15", 10);
    const limit = isNaN(limitParam) ? 15 : Math.min(Math.max(limitParam, 1), 50);
    const forceHybrid = searchParams.get("hybrid") === "true";

    // 4. Execute Two-Stage Search using Authenticated Supabase Client
    const localRepo = getMedicineRepository(auth.supabaseClient);
    const service = new HybridMedicineSearchService({ localRepo });

    const searchResponse = await service.search({
      query,
      dosageForm: dosageForm === "All" ? undefined : dosageForm,
      manufacturer,
      limit,
      forceHybrid,
    });

    const response = NextResponse.json(
      {
        success: true,
        data: searchResponse,
      },
      { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
    );

    // Apply refreshed session cookies if applicable
    if (auth.refreshed) {
      applySessionCookies(response, request, {
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
      });
    }

    return response;
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to execute medicine search.";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
