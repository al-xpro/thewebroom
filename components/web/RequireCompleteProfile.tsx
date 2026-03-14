"use client";

import { useEffect } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { isOnboardingComplete } from "@/lib/onboarding";
import { authClient } from "@/lib/auth-client";

export default function RequireCompleteProfile() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useConvexAuth();
  // Always fetch the user query - don't skip if not authenticated
  // We need this data to determine routing for authenticated pages
  const user = useQuery(api.auth.getCurrentUser);

  useEffect(() => {
    if (isLoading) return;
    
    // Get the pathname and determine route type early
    const isVerifyEmailRoute = pathname === "/auth/verify-email";
    const isAuthRoute = pathname.startsWith("/auth");
    const isPostAuthRoute = pathname.startsWith("/onboarding/post-auth");
    const isOnboardingRoute = pathname.startsWith("/onboarding/complete-profile");

    // Allow verify-email page regardless of auth status - exit early before any auth checks
    if (isVerifyEmailRoute) {
      return;
    }

    // From here on, we can assume the user should be authenticated
    if (!isAuthenticated) return;
    if (user === undefined) return;
    if (user === null) {
      void authClient.signOut().finally(() => {
        if (!pathname.startsWith("/auth")) {
          router.replace("/");
        }
      });
      return;
    }
    if (user.isBanned) {
      void authClient.signOut().finally(() => {
        const params = new URLSearchParams({ banned: "1" });
        if (user.banReason) params.set("reason", user.banReason);
        router.replace(`/auth/login?${params.toString()}`);
      });
      return;
    }

    const onboardingComplete = isOnboardingComplete(user);

    if (isPostAuthRoute) {
      return;
    }

    if (isAuthRoute) {
      router.replace(onboardingComplete ? "/" : "/onboarding/complete-profile");
      return;
    }

    if (isOnboardingRoute) {
      if (onboardingComplete) {
        router.replace("/");
      }
      return;
    }

    if (!onboardingComplete) {
      router.replace("/onboarding/complete-profile");
    }
  }, [isAuthenticated, isLoading, pathname, router, user]);

  return null;
}
