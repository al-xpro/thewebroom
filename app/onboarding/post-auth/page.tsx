"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { isOnboardingComplete } from "@/lib/onboarding";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import { safeNextPath, withNext } from "@/lib/next-path";

function PostAuthRedirect() {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.auth.getCurrentUser, isAuthenticated ? undefined : "skip");

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace(withNext("/auth/login", next));
      return;
    }

    if (user === undefined) {
      const timeout = window.setTimeout(() => {
        void authClient.signOut().finally(() => {
          router.replace("/auth/login");
        });
      }, 5000);
      return () => window.clearTimeout(timeout);
    }
    if (user === null) {
      void authClient.signOut().finally(() => {
        router.replace("/auth/login");
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

    if (!isOnboardingComplete(user)) {
      router.replace(withNext("/onboarding/complete-profile", next));
      return;
    }

    router.replace(next ?? "/");
  }, [isAuthenticated, isLoading, next, router, user]);

  return (
    <div className="flex w-full h-full items-center justify-center">
      <Loader2 className="size-6 animate-spin text-paragraph" />
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex w-full h-full items-center justify-center">
      <Loader2 className="size-6 animate-spin text-paragraph" />
    </div>
  );
}

export default function PostAuthPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <PostAuthRedirect />
    </Suspense>
  );
}
