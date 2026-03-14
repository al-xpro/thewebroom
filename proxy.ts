import { NextResponse, type NextRequest } from "next/server";
import { checkBotSignals } from "@/lib/bot-protection";

const AUTH_ROUTES = [
  "/auth/login",
  "/auth/sign-up",
  "/auth/forgot-password",
  "/auth/otp",
  "/auth/reset-password",
];

// In-memory store for edge-level rate limiting.
// This is additive — Convex DB rate limits are the authoritative guard.
// This map catches obvious hammering before requests reach Convex at all.
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

const RATE_LIMIT_RULES: { pattern: RegExp; limit: number; windowMs: number }[] = [
  { pattern: /^\/api\/auth/,        limit: 20, windowMs: 60_000 },
  { pattern: /^\/api\/create-blog/, limit: 10, windowMs: 60_000 },
  { pattern: /^\/auth\//,           limit: 30, windowMs: 60_000 },
];

const AI_SCRAPER_UA = /GPTBot|ChatGPT-User|CCBot|anthropic-ai|Claude-Web|Bytespider|PetalBot/i;

// IP ban cache — avoids hitting Convex on every request
const ipBanCache = new Map<string, { banned: boolean; cachedAt: number }>();
const IP_BAN_CACHE_TTL_MS = 5 * 60 * 1000;
const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_URL
  ?.replace(".convex.cloud", ".convex.site");

function getIp(request: NextRequest): string {
  // On Vercel, x-vercel-forwarded-for is set by Vercel's infrastructure
  // and cannot be spoofed from the internet. Do NOT fall back to
  // x-forwarded-for or x-real-ip — those are user-controllable headers.
  const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim();

  if (!ip) {
    // Not running on Vercel (local dev) — use forwarded-for as best-effort
    // This is safe locally since there's no production traffic here
    return (
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      "unknown"
    );
  }

  return ip;
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

async function isIpBanned(ip: string): Promise<boolean> {
  if (!CONVEX_SITE_URL || ip === "unknown") return false;

  const cached = ipBanCache.get(ip);
  if (cached && Date.now() - cached.cachedAt < IP_BAN_CACHE_TTL_MS) {
    return cached.banned;
  }

  try {
    const res = await fetch(
      `${CONVEX_SITE_URL}/is-ip-banned?ip=${encodeURIComponent(ip)}`,
      { signal: AbortSignal.timeout(800) }
    );
    if (res.ok) {
      const data = await res.json();
      ipBanCache.set(ip, { banned: Boolean(data.banned), cachedAt: Date.now() });
      return Boolean(data.banned);
    }
  } catch {
    // Fail open — don't block users if Convex is slow
  }

  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getIp(request);
  const ua = request.headers.get("user-agent") ?? "";

  // Block AI scrapers
  if (AI_SCRAPER_UA.test(ua)) return new NextResponse(null, { status: 403 });

  // Bot detection (UA patterns + Vercel BotID if Pro)
  const botCheck = checkBotSignals(request);
  if (botCheck.isBot) return new NextResponse(null, { status: 403 });

  // IP ban check
  if (await isIpBanned(ip)) return new NextResponse(null, { status: 403 });

  // Edge rate limiting
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
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/create", "/auth/:path*", "/api/auth/:path*", "/api/create-blog"],
};