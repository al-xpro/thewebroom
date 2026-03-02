import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "./lib/auth-server";

const AUTH_ROUTES = [
  "/auth/login",
  "/auth/sign-up",
  "/auth/forgot-password",
  "/auth/reset-password",
];

export async function proxy(request: NextRequest) {
  // For Convex Better Auth, the token is managed by the Convex client
  // We can't easily check it server-side in middleware
  // So just let protected routes through and handle auth in the page/component

  // If you really need middleware protection, you'd need to verify the JWT
  // But it's simpler to handle auth in your components with useConvexAuth()

  const { pathname } = request.nextUrl;

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (isAuthRoute) {
    try {
      const token = await getToken();
      if (token) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    } catch {
      // If token check fails, let the request through — the page will handle it.
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/create", "/auth/:path*"], // Keep /posts public for now
};
