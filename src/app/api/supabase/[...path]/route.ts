import { NextRequest, NextResponse } from "next/server";
import {
  verifyDoctorSession,
  applySessionCookies,
} from "@/lib/auth/session";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";

export const runtime = "nodejs";

const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "accept-profile",
  "content-profile",
  "content-type",
  "prefer",
  "range",
  "x-client-info",
];

const FORWARDED_RESPONSE_HEADERS = [
  "content-type",
  "content-range",
  "preference-applied",
  "location",
];

async function handleSupabaseProxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await context.params;
  const subPath = (path || []).join("/");

  // 1. Strictly block public self-registration
  if (subPath.startsWith("auth/v1/signup")) {
    return NextResponse.json(
      {
        error:
          "Public self-registration is disabled for this clinical system.",
      },
      { status: 403, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }

  const method = request.method.toUpperCase();
  const isPublicMedicineRead =
    (method === "GET" || method === "HEAD") &&
    subPath === "rest/v1/medicines";

  // 2. Verify clinician session for all clinical table and RPC operations
  const session = await verifyDoctorSession(request);

  if (!session.authenticated && !isPublicMedicineRead) {
    return NextResponse.json(
      { error: session.reason },
      { status: session.status, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }

  const upstreamBaseUrl = (
    process.env.SUPABASE_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  ).replace(/\/+$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!upstreamBaseUrl || !anonKey) {
    return NextResponse.json(
      { error: "Supabase backend configuration is unavailable." },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }

  const targetUrl = `${upstreamBaseUrl}/${subPath}${request.nextUrl.search}`;

  const outboundHeaders = new Headers();
  for (const h of FORWARDED_REQUEST_HEADERS) {
    const val = request.headers.get(h);
    if (val) outboundHeaders.set(h, val);
  }

  outboundHeaders.set("apikey", anonKey);
  if (session.authenticated) {
    outboundHeaders.set("Authorization", `Bearer ${session.accessToken}`);
  } else {
    outboundHeaders.set("Authorization", `Bearer ${anonKey}`);
  }

  const hasBody = method !== "GET" && method !== "HEAD";
  const bodyBuffer = hasBody ? await request.arrayBuffer() : undefined;

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method,
      headers: outboundHeaders,
      body: bodyBuffer && bodyBuffer.byteLength > 0 ? bodyBuffer : undefined,
      cache: "no-store",
    });

    const responseHeaders = new Headers(CLINICAL_API_SECURITY_HEADERS);
    for (const h of FORWARDED_RESPONSE_HEADERS) {
      const val = upstreamResponse.headers.get(h);
      if (val) responseHeaders.set(h, val);
    }

    const responseData =
      method === "HEAD" ? null : await upstreamResponse.arrayBuffer();

    const response = new NextResponse(responseData, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });

    if (session.authenticated && session.refreshed) {
      applySessionCookies(response, request, {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      });
    }

    return response;
  } catch (err: unknown) {
    console.error("[Supabase Gateway Error]", err);
    return NextResponse.json(
      { error: "Failed to communicate with clinical database gateway." },
      { status: 502, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleSupabaseProxy(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleSupabaseProxy(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleSupabaseProxy(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleSupabaseProxy(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleSupabaseProxy(request, context);
}

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleSupabaseProxy(request, context);
}
