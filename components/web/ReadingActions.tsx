"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, Lightbulb } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { showErrorToast } from "@/components/ui/toast";
import { withNext } from "@/lib/next-path";
import { cn } from "@/lib/utils";

function errorText(error: unknown, fallback: string) {
  return error instanceof ConvexError && typeof error.data === "string" ? error.data : fallback;
}

// Save a post to the reading list (/reading-list). Signed out, it asks to log in.
export function BookmarkButton({ postId }: { postId: Id<"posts"> }) {
  const { isAuthenticated } = useConvexAuth();
  const pathname = usePathname();
  const saved = useQuery(api.reading.isBookmarked, isAuthenticated ? { postId } : "skip");
  const toggle = useMutation(api.reading.toggleBookmark).withOptimisticUpdate((store, { postId: id }) => {
    const current = store.getQuery(api.reading.isBookmarked, { postId: id });
    if (current !== undefined) store.setQuery(api.reading.isBookmarked, { postId: id }, !current);
  });

  if (!isAuthenticated) {
    return (
      <Button asChild variant="ghost" size="icon-sm" title="Save to your reading list">
        <Link href={withNext("/auth/login", pathname)} aria-label="Log in to save this post">
          <Bookmark className="size-4" />
        </Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-pressed={Boolean(saved)}
      aria-label={saved ? "Remove from your reading list" : "Save to your reading list"}
      title={saved ? "Saved: remove from your reading list" : "Save to your reading list"}
      onClick={() => toggle({ postId }).catch((error) => showErrorToast(errorText(error, "Couldn't save the post")))}
    >
      {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
    </Button>
  );
}

// One reaction, with no public count: readers see their own, the author sees the total.
export function HelpfulButton({ postId }: { postId: Id<"posts"> }) {
  const { isAuthenticated } = useConvexAuth();
  const pathname = usePathname();
  const state = useQuery(api.reading.helpful, { postId });
  const toggle = useMutation(api.reading.toggleHelpful).withOptimisticUpdate((store, { postId: id }) => {
    const current = store.getQuery(api.reading.helpful, { postId: id });
    if (current) store.setQuery(api.reading.helpful, { postId: id }, { ...current, mine: !current.mine });
  });
  const [pulse, setPulse] = useState(0);

  if (state?.isAuthor) {
    return (
      <p className="type-meta inline-flex items-center gap-2 text-sm">
        <Lightbulb className="size-4" />
        {state.count === 0
          ? "No one has marked this helpful yet. Only you see this."
          : `${state.count} ${state.count === 1 ? "reader" : "readers"} found this helpful. Only you see this.`}
      </p>
    );
  }

  const mine = Boolean(state?.mine);
  const button = (
    <motion.span
      key={pulse}
      initial={pulse ? { scale: 0.92 } : false}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 18 }}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors",
        mine
          ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
          : "border-black/10 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
      )}
    >
      <Lightbulb className="size-4" />
      {mine ? "You found this helpful" : "Helpful"}
    </motion.span>
  );

  if (!isAuthenticated) {
    return (
      <Link href={withNext("/auth/login", pathname)} aria-label="Log in to mark this post helpful">
        {button}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={mine}
      className="cursor-pointer"
      onClick={() => {
        setPulse((n) => n + 1);
        toggle({ postId }).catch((error) => showErrorToast(errorText(error, "Couldn't save that")));
      }}
    >
      {button}
    </button>
  );
}

// The series a post belongs to: its parts in order, the current one marked, and the
// previous and next part. A short line at the top, the full box at the end.
export function SeriesBox({ postId, compact = false }: { postId: Id<"posts">; compact?: boolean }) {
  const series = useQuery(api.reading.seriesForPost, { postId });
  if (!series) return null;
  const index = series.parts.findIndex((part) => part.id === series.current);
  const previous = series.parts[index - 1];
  const next = series.parts[index + 1];

  if (compact) {
    return (
      <p className="type-meta text-xs">
        Part {index + 1} of {series.parts.length} in{" "}
        <Link href={`/series/${series.slug}`} className="text-black underline underline-offset-4 dark:text-white">
          {series.title}
        </Link>
      </p>
    );
  }

  return (
    <nav aria-label={`Series: ${series.title}`} className="relative divider-fade-top space-y-4 py-8">
      <div className="space-y-1">
        <p className="type-label">Series</p>
        <Link href={`/series/${series.slug}`} className="type-heading hover:underline underline-offset-4">
          {series.title}
        </Link>
      </div>
      <ol className="space-y-1.5">
        {series.parts.map((part) => (
          <li key={part.id} className="grid grid-cols-[1.75rem_1fr] text-sm">
            <span className="font-mono text-xs leading-5 text-[#A0A0A0]">{String(part.number).padStart(2, "0")}</span>
            {part.id === series.current ? (
              <span aria-current="page" className="font-medium">{part.title}</span>
            ) : (
              <Link href={`/posts/${part.slug}`} className="font-light hover:underline underline-offset-4">
                {part.title}
              </Link>
            )}
          </li>
        ))}
      </ol>
      <div className="flex justify-between gap-4 text-sm">
        {previous ? (
          <Link href={`/posts/${previous.slug}`} className="inline-flex items-center gap-1.5 hover:underline underline-offset-4">
            <ArrowLeft className="size-4" /> Part {previous.number}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/posts/${next.slug}`} className="inline-flex items-center gap-1.5 hover:underline underline-offset-4">
            Part {next.number}: {next.title} <ArrowRight className="size-4" />
          </Link>
        )}
      </div>
    </nav>
  );
}
