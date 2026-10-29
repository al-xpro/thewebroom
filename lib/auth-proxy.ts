import "server-only";

import {
  CLIENT_IP_HEADER,
  PROXY_SIGNATURE_HEADER,
  PROXY_TIMESTAMP_HEADER,
  signClientIp,
} from "@/lib/auth-proxy-signature";

// Same trust rule as proxy.ts: on Vercel only x-vercel-forwarded-for (set by Vercel, not
// spoofable); x-forwarded-for only when not running on Vercel (local dev).
function getClientIp(headers: Headers): string {
  const vercelIp = headers.get("x-vercel-forwarded-for")?.split(",")[0].trim();
  if (vercelIp) return vercelIp;
  if (process.env.VERCEL) return "unknown";
  return headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

/**
 * Returns the request with the client IP and its signature added, for Convex to verify.
 * Any copies of those headers sent by the client are dropped first.
 */
export async function withSignedClientIp(request: Request): Promise<Request> {
  const headers = new Headers(request.headers);
  headers.delete(CLIENT_IP_HEADER);
  headers.delete(PROXY_TIMESTAMP_HEADER);
  headers.delete(PROXY_SIGNATURE_HEADER);

  const secret = process.env.AUTH_PROXY_SECRET;
  if (secret) {
    const ip = getClientIp(request.headers);
    const timestamp = Date.now();
    headers.set(CLIENT_IP_HEADER, ip);
    headers.set(PROXY_TIMESTAMP_HEADER, String(timestamp));
    headers.set(PROXY_SIGNATURE_HEADER, await signClientIp(secret, ip, timestamp));
  } else {
    console.error("[Auth][Proxy] AUTH_PROXY_SECRET is not set: Convex will refuse sign-ups.");
  }

  // Rebuilt from its parts: `new Request(request, ...)` throws "Cannot read private member
  // #state" when the incoming request comes from another copy of the Request class.
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  return new Request(request.url, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    signal: request.signal,
  });
}
