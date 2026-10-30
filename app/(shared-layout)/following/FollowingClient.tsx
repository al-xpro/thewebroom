"use client";

import Link from "next/link";
import { useConvexAuth, useQuery } from "convex/react";
import { format } from "date-fns";
import { api } from "@/convex/_generated/api";
import { TOPICS } from "@/convex/topics";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberAvatar } from "@/components/web/MemberAvatar";
import { PostCard } from "@/components/web/PostCard";
import { SignInPrompt } from "@/components/web/SignInPrompt";
import { TopicBadge } from "@/components/web/TopicBadge";

// The member's Following page: new posts from the people and topics they follow.
export function FollowingClient() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const data = useQuery(api.follows.following, isAuthenticated ? {} : "skip");

  if (!isLoading && !isAuthenticated) {
    return <SignInPrompt title="Following" text="Follow people and topics to see their new posts here." next="/following" />;
  }

  return (
    <>
      <div className="space-y-2 py-10">
        <h1 className="type-display">Following</h1>
        <p className="type-body">New posts from the people and topics you follow.</p>
      </div>

      <section className="section-minimal">
        <h2 className="type-label">Topics</h2>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((topic) => (
            <TopicBadge key={topic} topic={topic} />
          ))}
        </div>
        <p className="type-meta text-xs">Click a topic to follow or unfollow it.</p>
      </section>

      <section className="section-minimal">
        <h2 className="type-label">People</h2>
        {!data ? (
          <Skeleton className="h-10 w-full" />
        ) : data.people.length === 0 ? (
          <p className="type-meta">
            You don’t follow anyone yet. Find writers in the{" "}
            <Link href="/community" className="underline underline-offset-4 text-black dark:text-white">
              community
            </Link>
            .
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            {data.people.map((person) => (
              <li key={person.id}>
                <Link href={`/members/${person.id}`} className="group flex items-center gap-3">
                  <MemberAvatar name={person.name} url={person.avatarUrl} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium group-hover:underline underline-offset-4">{person.name}</p>
                    <p className="type-meta text-xs">
                      {person.posts} {person.posts === 1 ? "post" : "posts"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section-minimal">
        <h2 className="type-label">Latest</h2>
        {!data ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : data.feed.length === 0 ? (
          <p className="type-meta">Nothing new yet.</p>
        ) : (
          <div>
            {data.feed.map((post) => (
              <div key={post.id}>
                <p className="type-meta pt-2 text-xs">
                  <Link href={`/members/${post.authorId}`} className="hover:text-black dark:hover:text-white">
                    {post.authorName}
                  </Link>{" "}
                  · {format(post.publishedAt, "MMM d")}
                </p>
                <PostCard post={post} />
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
