"use client";

import { useEffect } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { isOnboardingComplete } from "@/lib/onboarding";

export default function RequireCompleteProfile() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.auth.getCurrentUser, isAuthenticated ? undefined : "skip");

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;
    if (user === undefined) return;
    if (user === null) {
      router.replace("/");
      return;
    }

    const onboardingComplete = isOnboardingComplete(user);
    const isAuthRoute = pathname.startsWith("/auth");
    const isOnboardingRoute = pathname.startsWith("/onboarding/complete-profile");

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
