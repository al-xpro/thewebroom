"use client";

import { trackEvent } from "@/lib/analytics";
import { useState } from "react";
import Link from "next/link";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { showErrorToast } from "@/components/ui/toast";
import { withNext } from "@/lib/next-path";
import { ConvexError } from "convex/values";

// Follow or unfollow a member; signed-out visitors are sent to log in first.
export function FollowButton({ userId, returnTo }: { userId: string; returnTo: string }) {
  const { isAuthenticated } = useConvexAuth();
  const following = useQuery(api.follows.isFollowingUser, isAuthenticated ? { userId } : "skip");
  const follow = useMutation(api.follows.followUser);
  const unfollow = useMutation(api.follows.unfollowUser);
  const [pending, setPending] = useState(false);

  if (!isAuthenticated) {
    return (
      <Button asChild size="sm">
        <Link href={withNext("/auth/login", returnTo)}>Follow</Link>
      </Button>
    );
  }

  const toggle = async () => {
    setPending(true);
    try {
      await (following ? unfollow({ userId }) : follow({ userId }));
      if (!following) trackEvent("follow", { target: "member" });
    } catch (error) {
      showErrorToast(error instanceof ConvexError && typeof error.data === "string" ? error.data : "Couldn't update the follow");
    } finally {
      setPending(false);
    }
  };

  return (
    <Button size="sm" variant={following ? "outline" : "default"} disabled={pending || following === undefined} onClick={() => void toggle()}>
      {following ? "Following" : "Follow"}
    </Button>
  );
}
