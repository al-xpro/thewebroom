import { NextResponse, type NextRequest } from "next/server";

const AUTH_ROUTES = [
  "/auth/login",
  "/auth/sign-up",
  "/auth/forgot-password",
  "/auth/otp",
  "/auth/reset-password",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: ["/create", "/auth/:path*"], // Keep /posts public for now
};
