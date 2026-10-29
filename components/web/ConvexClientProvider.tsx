"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { authClient } from "@/lib/auth-client";
import { ConvexBetterAuthProvider, type AuthClient } from "@convex-dev/better-auth/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
  // Don't require auth initially - let the app handle auth state
});

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    // The package types AuthClient as a union over plugin lists that better-auth 1.6 collapses
    // to `never`; the client is the documented `createAuthClient({ plugins: [convexClient()] })`.
    <ConvexBetterAuthProvider client={convex} authClient={authClient as unknown as AuthClient}>
      {children}
    </ConvexBetterAuthProvider>
  );
}
