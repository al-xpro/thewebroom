"use client";

import Link from "next/link";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { BookmarkX } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PostCard } from "@/components/web/PostCard";
import { SignInPrompt } from "@/components/web/SignInPrompt";

// Posts the member saved to read later, newest saved first.
export function ReadingListClient() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const items = useQuery(api.reading.myReadingList, isAuthenticated ? {} : "skip");
  const toggle = useMutation(api.reading.toggleBookmark);

  if (!isLoading && !isAuthenticated) {
    return <SignInPrompt title="Reading list" text="Save posts to read later; they wait for you here." next="/reading-list" />;
  }

  return (
    <>
      <div className="flex items-end justify-between gap-4 py-10">
        <h1 className="type-display">Reading list</h1>
        {items && items.length > 0 && <p className="type-meta tabular-nums">{items.length}</p>}
      </div>

      {!items ? (
        <div className="space-y-3 pb-10">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="relative divider-fade-top py-16 text-center">
          <p className="type-heading">Nothing saved yet</p>
          <p className="type-meta">
            Use the bookmark on any post. Start with the{" "}
            <Link href="/posts" className="underline underline-offset-4">
              latest posts
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="pb-10">
          {items.map((item) => (
            <li key={item.postId} className="relative">
              <div className="flex items-center justify-between gap-3 pt-2">
                <p className="type-meta text-xs">
                  <Link href={`/members/${item.authorId}`} className="hover:text-black dark:hover:text-white">
                    {item.authorName}
                  </Link>{" "}
                  · saved {formatDistanceToNow(item.savedAt, { addSuffix: true })}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${item.title} from your reading list`}
                  title="Remove"
                  onClick={() => void toggle({ postId: item.postId })}
                >
                  <BookmarkX className="size-4" />
                </Button>
              </div>
              <PostCard post={item} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
