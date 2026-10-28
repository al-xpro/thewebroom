/**
 * Signs the client IP that the Next.js auth route forwards to Convex, so Convex can trust
 * it and refuse sign-ups that didn't come through the website. Shared by `lib/auth-proxy.ts`
 * (Next.js) and `convex/auth.ts` (Convex); Web Crypto works in both runtimes.
 */

export const CLIENT_IP_HEADER = "x-twr-client-ip";
export const PROXY_TIMESTAMP_HEADER = "x-twr-proxy-ts";
export const PROXY_SIGNATURE_HEADER = "x-twr-proxy-sig";

// A signature older than this is refused, so a captured one can't be replayed later.
export const PROXY_SIGNATURE_MAX_AGE_MS = 60_000;

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signClientIp(secret: string, ip: string, timestamp: number) {
  return hmacHex(secret, `${ip}.${timestamp}`);
}

/** Returns the client IP if the headers carry a fresh, valid signature, otherwise null. */
export async function verifyClientIp(
  secret: string,
  headers: Headers,
  now = Date.now()
): Promise<string | null> {
  const ip = headers.get(CLIENT_IP_HEADER);
  const timestamp = Number(headers.get(PROXY_TIMESTAMP_HEADER));
  const signature = headers.get(PROXY_SIGNATURE_HEADER);
  if (!ip || !signature || !Number.isFinite(timestamp)) return null;
  if (Math.abs(now - timestamp) > PROXY_SIGNATURE_MAX_AGE_MS) return null;

  const expected = await signClientIp(secret, ip, timestamp);
  return constantTimeEqual(expected, signature) ? ip : null;
}
