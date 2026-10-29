import { handler } from "@/lib/auth-server";
import { withSignedClientIp } from "@/lib/auth-proxy";

// Every auth request reaches Convex with a signed client IP: Convex uses it for the
// account-creation limit and refuses sign-ups that didn't come through this route.
export async function GET(request: Request) {
  return handler.GET(await withSignedClientIp(request));
}

export async function POST(request: Request) {
  return handler.POST(await withSignedClientIp(request));
}
