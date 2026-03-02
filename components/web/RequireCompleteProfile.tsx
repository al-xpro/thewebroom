"use client";

import { useEffect } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { isNameComplete } from "@/lib/onboarding";

export default function RequireCompleteProfile() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.auth.getCurrentUser, isAuthenticated ? undefined : "skip");

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;
    if (pathname.startsWith("/onboarding/complete-profile")) return;
    if (user === undefined) return;

    if (!isNameComplete(user?.name)) {
      router.replace("/onboarding/complete-profile");
    }
  }, [isAuthenticated, isLoading, pathname, router, user]);

  return null;
}
