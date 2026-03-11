import { NextResponse, type NextRequest } from "next/server";

const AUTH_ROUTES = [
  "/auth/login",
  "/auth/sign-up",
  "/auth/forgot-password",
  "/auth/otp",
  "/auth/reset-password",
];

// In-memory rate limit store — resets on cold start but sufficient for
// edge middleware on Hobby plans. For persistent cross-instance limits
// use Upstash Redis.
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

const RATE_LIMIT_RULES: { pattern: RegExp; limit: number; windowMs: number }[] = [
  { pattern: /^\/api\/auth/,        limit: 20, windowMs: 60_000 }, // 20/min
  { pattern: /^\/api\/create-blog/, limit: 10, windowMs: 60_000 }, // 10/min
  { pattern: /^\/auth\//,           limit: 30, windowMs: 60_000 }, // 30/min
];

const BLOCKED_UA = /GPTBot|ChatGPT-User|CCBot|anthropic-ai|Claude-Web|Bytespider|PetalBot/i;

function getIp(request: NextRequest): string {
  return (
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkRateLimit(ip: string, pathname: string): boolean {
  const rule = RATE_LIMIT_RULES.find((r) => r.pattern.test(pathname));
  if (!rule) return true;

  const key = `${ip}:${pathname.split("/").slice(0, 3).join("/")}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart > rule.windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= rule.limit) return false;

  entry.count++;
  return true;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getIp(request);

  // Block known AI scrapers and crawlers
  const ua = request.headers.get("user-agent") ?? "";
  if (BLOCKED_UA.test(ua)) {
    return new NextResponse(null, { status: 403 });
  }

  // Edge-level rate limiting
  if (!checkRateLimit(ip, pathname)) {
    return NextResponse.json(
      { message: "Too many requests. Please slow down and try again shortly." },
      { status: 429 }
    );
  }

  // Auth route guards
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  if (isAuthRoute) {
    if (pathname.startsWith("/auth/reset-password")) {
      const token = request.nextUrl.searchParams.get("token")?.trim();
      if (!token) {
        return NextResponse.redirect(new URL("/auth/forgot-password", request.url));
      }
    }

    // Authenticated-route redirects are handled client-side by RequireCompleteProfile.
    // This avoids stale-cookie redirect loops after account deletion.
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/create", "/auth/:path*", "/api/auth/:path*", "/api/create-blog"],
};