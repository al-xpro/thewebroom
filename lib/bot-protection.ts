/**
 * Bot protection utilities for Next.js Edge Middleware (proxy.ts).
 * All functions here only use NextRequest — never import from "next/headers"
 * which is Server Component only and throws in Edge middleware.
 *
 * Vercel BotID headers (x-vercel-botid-score) are injected automatically
 * when Attack Challenge Mode is enabled in your Vercel project settings
 * under Security → Bot Protection. Requires Pro or Enterprise plan.
 */

import type { NextRequest } from "next/server";

/**
 * Known malicious/scraper user agent patterns.
 * The BLOCKED_UA list in proxy.ts covers AI scrapers separately.
 */
const BOT_UA_PATTERNS = [
  /bot(?!tone)?/i,       // generic bots, but not "Bottone" etc.
  /crawl/i,
  /scrape/i,
  /spider/i,
  /curl\//i,
  /wget\//i,
  /python-requests/i,
  /go-http-client/i,
  /java\//i,
  /libwww-perl/i,
  /axios\//i,            // headless scripts
  /node-fetch/i,
];

export interface BotCheckResult {
  isBot: boolean;
  /** 0–1 confidence score. 1 = definitely bot. */
  score: number;
  reason: string;
}

/**
 * Check for bot signals using only NextRequest headers.
 * Reads Vercel BotID score if available, otherwise falls back to UA analysis.
 */
export function checkBotSignals(request: NextRequest): BotCheckResult {
  const ua = request.headers.get("user-agent") ?? "";

  // ── Vercel BotID (Pro/Enterprise with Attack Challenge Mode) ─────────────
  const botScoreStr = request.headers.get("x-vercel-botid-score");
  if (botScoreStr) {
    const score = parseFloat(botScoreStr);
    if (!isNaN(score)) {
      return {
        isBot: score > 0.7,
        score,
        reason: score > 0.7 ? "vercel-botid-score-high" : "vercel-botid-score-low",
      };
    }
  }

  // ── UA-based fallback ────────────────────────────────────────────────────
  if (!ua) {
    // No user agent at all is highly suspicious for a browser request
    return { isBot: true, score: 0.9, reason: "no-user-agent" };
  }

  if (BOT_UA_PATTERNS.some((p) => p.test(ua))) {
    return { isBot: true, score: 0.85, reason: "bot-user-agent" };
  }

  return { isBot: false, score: 0.1, reason: "clean" };
}