"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberAvatar } from "@/components/web/MemberAvatar";
import { TopicBadge } from "@/components/web/TopicBadge";

// Who writes here and what's happening, from real posts and comments.
export function CommunityClient() {
  const data = useQuery(api.community.overview);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 py-10">
        <h1 className="type-display">Community</h1>
        {data && (
          <p className="type-meta tabular-nums">
            {data.totals.writers} writers · {data.totals.posts} posts
          </p>
        )}
      </div>

      <section className="section-minimal">
        <h2 className="type-label">Writers</h2>
        {!data ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data.writers.length === 0 ? (
          <p className="type-meta">No one has published yet.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            {data.writers.map((writer) => (
              <li key={writer.id}>
                <Link href={`/members/${writer.id}`} className="group flex items-center gap-3">
                  <MemberAvatar name={writer.name} url={writer.avatarUrl} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium group-hover:underline underline-offset-4">{writer.name}</p>
                    <p className="type-meta truncate text-xs">
                      {writer.posts} {writer.posts === 1 ? "post" : "posts"} · last{" "}
                      {formatDistanceToNow(writer.lastPostAt, { addSuffix: true })}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section-minimal">
        <h2 className="type-label">Lately</h2>
        {data && data.lately.length === 0 && <p className="type-meta">Nothing yet.</p>}
        <ul className="space-y-3">
          {data?.lately.map((item, index) => (
            <li key={index} className="flex items-baseline justify-between gap-4 text-sm">
              <p className="min-w-0 font-light text-[#666666] dark:text-[#A0A0A0]">
                <Link href={`/members/${item.actorId}`} className="font-medium text-black hover:underline underline-offset-4 dark:text-white">
                  {item.actorName}
                </Link>{" "}
                {item.kind === "post" ? "published" : "commented on"}{" "}
                <Link href={`/posts/${item.postSlug}`} className="text-black hover:underline underline-offset-4 dark:text-white">
                  {item.postTitle}
                </Link>
              </p>
              <span className="type-meta shrink-0 text-xs">{formatDistanceToNow(item.at, { addSuffix: true })}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section-minimal">
        <h2 className="type-label">Topics</h2>
        <div className="flex flex-wrap gap-3">
          {data?.topics.map((item) => (
            <span key={item.topic} className="inline-flex items-center gap-2 text-sm">
              <TopicBadge topic={item.topic} />
              <span className="type-meta text-xs tabular-nums">{item.posts}</span>
            </span>
          ))}
        </div>
        <p className="type-meta text-xs">Signed in, click a topic to follow it.</p>
      </section>
    </>
  );
}
