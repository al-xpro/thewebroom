"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Topic } from "@/convex/topics";
import { showErrorToast } from "@/components/ui/toast";

// The signed-in member's followed topics, with follow/unfollow that update at once and
// roll back if the server refuses (#59).
export function useTopicFollows() {
  const { isAuthenticated } = useConvexAuth();
  const followed = useQuery(api.follows.myFollowedTopics, isAuthenticated ? {} : "skip");

  const follow = useMutation(api.follows.followTopic).withOptimisticUpdate((store, { topic }) => {
    const current = store.getQuery(api.follows.myFollowedTopics, {});
    if (current && !current.includes(topic)) {
      store.setQuery(api.follows.myFollowedTopics, {}, [...current, topic]);
    }
  });
  const unfollow = useMutation(api.follows.unfollowTopic).withOptimisticUpdate((store, { topic }) => {
    const current = store.getQuery(api.follows.myFollowedTopics, {});
    if (current) {
      store.setQuery(api.follows.myFollowedTopics, {}, current.filter((t) => t !== topic));
    }
  });

  const isFollowing = (topic: Topic) => followed?.includes(topic) ?? false;

  const toggle = (topic: Topic) => {
    const change = isFollowing(topic) ? unfollow({ topic }) : follow({ topic });
    change.catch((error) => {
      showErrorToast(error?.data ?? error?.message ?? "Couldn't update the topics you follow");
    });
  };

  return { canFollow: isAuthenticated && followed !== undefined, isFollowing, toggle };
}
