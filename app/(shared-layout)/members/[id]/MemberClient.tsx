"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { FollowButton } from "@/components/web/FollowButton";
import { MemberAvatar } from "@/components/web/MemberAvatar";
import { PostCard } from "@/components/web/PostCard";

// A member's public page: who they are, what they've published, and a follow button.
export function MemberClient({ userId }: { userId: string }) {
  const member = useQuery(api.community.member, { userId });

  if (member === undefined) {
    return (
      <div className="flex items-center gap-5 py-10">
        <Skeleton className="size-16 rounded-full" />
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (member === null) {
    return (
      <div className="space-y-2 py-10">
        <h1 className="type-display">Not found</h1>
        <p className="type-body">
          This member doesn’t exist. See the{" "}
          <Link href="/community" className="underline underline-offset-4">
            community
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <>
      <section className="flex flex-wrap items-center gap-5 py-10">
        <MemberAvatar name={member.name} url={member.avatarUrl} className="size-16" />
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="type-title truncate">{member.name}</h1>
          <p className="type-meta">
            {member.posts.length} {member.posts.length === 1 ? "post" : "posts"}
            {member.followers !== null && ` · ${member.followers} ${member.followers === 1 ? "follower" : "followers"} (only you see this)`}
          </p>
        </div>
        {member.isSelf ? (
          <Link href="/profile" className="type-meta hover:text-black dark:hover:text-white">
            Edit profile
          </Link>
        ) : (
          <FollowButton userId={member.id} returnTo={`/members/${member.id}`} />
        )}
      </section>

      <section className="section-minimal">
        <h2 className="type-label">Posts</h2>
        {member.posts.length === 0 ? (
          <p className="type-meta">Nothing published yet.</p>
        ) : (
          <div>
            {member.posts.map((post) => (
              <div key={post.id}>
                <p className="type-meta pt-2 text-xs">{format(post.publishedAt, "MMM d, yyyy")}</p>
                <PostCard post={post} />
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
