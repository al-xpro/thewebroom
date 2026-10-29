"use client";

import { Check, Plus } from "lucide-react";
import { isTopic } from "@/convex/topics";
import { useTopicFollows } from "@/hooks/use-topic-follows";
import { cn } from "@/lib/utils";

const badge = "inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 rounded-full font-medium bg-primary/10 text-primary";

// A post's topic. For signed-in members it's also the follow toggle.
export function TopicBadge({ topic }: { topic?: string }) {
  const { canFollow, isFollowing, toggle } = useTopicFollows();

  if (!topic || !isTopic(topic) || !canFollow) {
    return <span className={badge}>{topic}</span>;
  }

  const following = isFollowing(topic);
  return (
    <button
      type="button"
      onClick={() => toggle(topic)}
      aria-pressed={following}
      title={following ? `Unfollow ${topic}` : `Follow ${topic}`}
      className={cn(badge, "cursor-pointer transition-colors hover:bg-primary/20")}
    >
      {topic}
      {following ? <Check className="size-3.5" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
      <span className="sr-only">{following ? "(following)" : "(follow)"}</span>
    </button>
  );
}
