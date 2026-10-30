"use client";

import { useState } from "react";
import Link from "next/link";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberAvatar } from "@/components/web/MemberAvatar";
import { SignInPrompt } from "@/components/web/SignInPrompt";
import { cn } from "@/lib/utils";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "comments", label: "Comments" },
  { key: "follower", label: "Followers" },
  { key: "post", label: "Posts" },
] as const;

type Filter = (typeof FILTERS)[number]["key"];

const TEXT = {
  comment: "commented on",
  reply: "replied to you on",
  follower: "followed you",
  post: "published",
  published: "Your scheduled post is out:",
} as const;

// Only what involves the member, newest first; unread is a dot, not a badge count.
export function NotificationsClient() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const items = useQuery(api.notifications.mine, isAuthenticated ? {} : "skip");
  const markAllRead = useMutation(api.notifications.markAllRead);
  const markRead = useMutation(api.notifications.markRead);
  const [filter, setFilter] = useState<Filter>("all");

  if (!isLoading && !isAuthenticated) {
    return <SignInPrompt title="Notifications" text="Comments, replies, followers and new posts that involve you." next="/notifications" />;
  }

  const shown = (items ?? []).filter((item) =>
    filter === "all" ? true : filter === "comments" ? item.kind === "comment" || item.kind === "reply" : item.kind === filter
  );
  const hasUnread = items?.some((item) => item.unread);

  return (
    <>
      <div className="flex items-end justify-between gap-4 py-10">
        <h1 className="type-display">Notifications</h1>
        {hasUnread && (
          <button type="button" onClick={() => void markAllRead()} className="type-meta cursor-pointer hover:text-black dark:hover:text-white">
            Mark all read
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1 pb-4">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={cn(
              "cursor-pointer rounded-full px-3 py-1 text-sm",
              filter === item.key ? "bg-black text-white dark:bg-white dark:text-black" : "text-[#666666] dark:text-[#A0A0A0]"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {!items ? (
        <div className="space-y-3 pb-10">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="type-meta pb-10">Nothing here yet.</p>
      ) : (
        <ul className="pb-10">
          {shown.map((item) => (
            <li key={item.id} className="relative divider-fade-top flex items-center gap-3 py-4">
              <span
                aria-label={item.unread ? "Unread" : undefined}
                className={cn("size-1.5 shrink-0 rounded-full", item.unread ? "bg-primary" : "bg-transparent")}
              />
              {item.actorName ? (
                <MemberAvatar name={item.actorName} url={item.actorAvatarUrl} className="size-8" />
              ) : (
                <span className="size-8 shrink-0" />
              )}
              <p
                className={cn(
                  "min-w-0 flex-1 text-sm",
                  item.unread ? "font-normal text-black dark:text-white" : "font-light text-[#666666] dark:text-[#A0A0A0]"
                )}
              >
                {item.actorName && item.kind !== "published" && (
                  <Link href={`/members/${item.actorId}`} className="font-medium hover:underline underline-offset-4">
                    {item.actorName}
                  </Link>
                )}{" "}
                {TEXT[item.kind]}{" "}
                {item.postSlug && (
                  <Link
                    href={`/posts/${item.postSlug}`}
                    onClick={() => item.unread && void markRead({ id: item.id })}
                    className="underline-offset-4 hover:underline"
                  >
                    {item.postTitle}
                  </Link>
                )}
              </p>
              <span className="type-meta shrink-0 text-xs">{formatDistanceToNow(item.createdAt, { addSuffix: true })}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
