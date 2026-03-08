"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { isOnboardingComplete } from "@/lib/onboarding";
import { Loader2 } from "lucide-react";

export default function PostAuthPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.auth.getCurrentUser, isAuthenticated ? undefined : "skip");

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    if (user === undefined) return;

    if (!isOnboardingComplete(user)) {
      router.replace("/onboarding/complete-profile");
      return;
    }

    router.replace("/");
  }, [isAuthenticated, isLoading, router, user]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="size-6 animate-spin text-paragraph" />
    </div>
  );
}
