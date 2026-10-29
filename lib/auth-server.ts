import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

export const { handler, getToken, isAuthenticated } = convexBetterAuthNextJs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  // `npx convex deploy` sets NEXT_PUBLIC_CONVEX_SITE_URL during the build; CI sets CONVEX_SITE_URL.
  convexSiteUrl: (process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? process.env.CONVEX_SITE_URL)!,
});
