import { constantTimeEqual, hmacHex } from "./auth-proxy-signature";

/**
 * Signs the cache-refresh requests Convex sends to the site when a scheduled post goes
 * out (#60), so only Convex can ask `/api/revalidate` to refresh pages. Shared by
 * `convex/revalidate.ts` and `app/api/revalidate/route.ts`.
 */

export const REVALIDATE_TIMESTAMP_HEADER = "x-twr-revalidate-ts";
export const REVALIDATE_SIGNATURE_HEADER = "x-twr-revalidate-sig";
export const REVALIDATE_MAX_AGE_MS = 5 * 60_000;

export function signRevalidation(secret: string, timestamp: number, body: string) {
  return hmacHex(secret, `${timestamp}.${body}`);
}

export async function verifyRevalidation(secret: string, headers: Headers, body: string) {
  const timestamp = Number(headers.get(REVALIDATE_TIMESTAMP_HEADER));
  const signature = headers.get(REVALIDATE_SIGNATURE_HEADER) ?? "";
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > REVALIDATE_MAX_AGE_MS) {
    return false;
  }
  return constantTimeEqual(signature, await signRevalidation(secret, timestamp, body));
}
