"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Sparkles } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";
import { reviewPostAction } from "@/app/admin/moderation-actions";
import { cn } from "@/lib/utils";

// The moderation agent in the admin: it reviews posts against the rules and sorts the
// riskiest first; the admin keeps or hides each one. Nothing changes without a click.

type AdminPost = {
  _id: string;
  title: string;
  authorName: string;
  slug?: string;
  status?: string;
  publishAt?: number;
  _creationTime: number;
};

const VERDICT = {
  hide: { label: "Hide", dot: "bg-destructive", rank: 0 },
  needs_changes: { label: "Needs changes", dot: "bg-primary", rank: 1 },
  ok: { label: "OK", dot: "bg-[#3FA35B]", rank: 3 },
} as const;

const BATCH = 10;

export function ModerationTab({ posts }: { posts: AdminPost[] }) {
  const reviews = useQuery(api.moderation.latestReviews);
  const decide = useMutation(api.moderation.decide);
  const updatePost = useMutation(api.posts.updatePost);
  const [running, setRunning] = useState<Set<string>>(new Set());
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  if (!reviews) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-5 animate-spin text-paragraph" />
      </div>
    );
  }

  const byPost = new Map(reviews.map((review) => [review.postId as string, review]));
  const candidates = posts.filter((post) => ["published", "flagged", "hidden"].includes(post.status || "published"));
  const unreviewed = candidates.filter((post) => !byPost.has(post._id) && (post.status || "published") === "published");

  // Undecided risky reviews first, by confidence; then unreviewed; then decided and OK.
  const rank = (post: AdminPost) => {
    const review = byPost.get(post._id);
    if (!review) return 2;
    if (review.decision) return 4;
    return VERDICT[review.verdict].rank;
  };
  const sorted = [...candidates].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (byPost.get(b._id)?.confidence ?? 0) - (byPost.get(a._id)?.confidence ?? 0) ||
      (b.publishAt ?? b._creationTime) - (a.publishAt ?? a._creationTime)
  );

  const review = async (postId: string) => {
    setRunning((current) => new Set(current).add(postId));
    const result = await reviewPostAction(postId);
    setRunning((current) => {
      const next = new Set(current);
      next.delete(postId);
      return next;
    });
    if (!result.ok) showErrorToast(result.error);
    else if (result.review.verdict !== "ok") setOpen(postId);
    return result.ok;
  };

  const reviewAll = async () => {
    const queue = unreviewed.slice(0, BATCH);
    setBatch({ done: 0, total: queue.length });
    for (const [index, post] of queue.entries()) {
      const ok = await review(post._id);
      setBatch({ done: index + 1, total: queue.length });
      if (!ok) break;
    }
    setBatch(null);
  };

  const keep = async (reviewId: Id<"moderationReviews">) => {
    try {
      await decide({ reviewId, decision: "kept" });
      showSuccessToast("Kept");
    } catch {
      showErrorToast("Couldn't save the decision");
    }
  };

  const hide = async (postId: string, reviewId: Id<"moderationReviews">) => {
    try {
      await updatePost({ postId: postId as Id<"posts">, status: "hidden" });
      await decide({ reviewId, decision: "hidden" });
      showSuccessToast("Post hidden; the author gets an e-mail");
    } catch {
      showErrorToast("Couldn't hide the post");
    }
  };

  return (
    <section className="relative divider-fade-top space-y-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="type-meta text-sm">
          The agent reviews posts against the rules and sorts the riskiest first. It never hides anything: you decide.
        </p>
        <Button size="sm" disabled={unreviewed.length === 0 || batch !== null} onClick={() => void reviewAll()}>
          {batch ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {batch
            ? `Reviewing ${batch.done}/${batch.total}`
            : unreviewed.length
              ? `Review ${Math.min(BATCH, unreviewed.length)} unreviewed`
              : "All reviewed"}
        </Button>
      </div>

      <ul>
        {sorted.map((post) => {
          const latest = byPost.get(post._id);
          const busy = running.has(post._id);
          const expanded = open === post._id;
          const status = post.status || "published";
          return (
            <li key={post._id} className="relative divider-fade-top py-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : post._id)}
                  className="min-w-0 flex-1 cursor-pointer space-y-0.5 text-left"
                  aria-expanded={expanded}
                >
                  <p className="type-heading truncate text-base">{post.title}</p>
                  <p className="type-meta truncate text-xs">
                    {post.authorName} · {new Date(post.publishAt ?? post._creationTime).toLocaleDateString("en-US")}
                    {latest && ` · reviewed ${formatDistanceToNow(latest.reviewedAt, { addSuffix: true })}`}
                  </p>
                </button>
                {latest ? (
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-light">
                    <span aria-hidden className={cn("size-1.5 rounded-full", VERDICT[latest.verdict].dot)} />
                    {VERDICT[latest.verdict].label}
                    <span className="tabular-nums opacity-60">{Math.round(latest.confidence * 100)}%</span>
                  </span>
                ) : (
                  <span className="type-meta shrink-0 text-xs">Not reviewed</span>
                )}
                <StatusBadge status={status} />
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => void review(post._id)}>
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  {latest ? "Again" : "Review"}
                </Button>
              </div>

              {latest && expanded && (
                <div className="mt-3 space-y-3 rounded-2xl bg-black/[0.03] p-4 dark:bg-white/[0.04]">
                  <div className="flex flex-wrap gap-1.5">
                    {latest.categories.map((category) => (
                      <span key={category} className="rounded-full bg-black/5 px-2 py-0.5 font-mono text-[11px] dark:bg-white/10">
                        {category}
                      </span>
                    ))}
                  </div>
                  <ul className="space-y-1.5">
                    {latest.reasons.map((reason, index) => (
                      <li key={index} className="flex gap-2 text-sm font-light">
                        <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-black dark:bg-white" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap items-center gap-1">
                    {post.slug && (
                      <Link href={`/posts/${post.slug}`} className="px-2 py-1 text-xs text-[#666666] hover:text-black dark:text-[#A0A0A0] dark:hover:text-white">
                        Read it
                      </Link>
                    )}
                    {latest.decision ? (
                      <p className="type-meta text-xs">{latest.decision === "kept" ? "You kept it." : "You hid it."}</p>
                    ) : (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => void keep(latest.id)}>
                          Keep
                        </Button>
                        {status === "published" && (
                          <Button variant="destructive" size="sm" onClick={() => void hide(post._id, latest.id)}>
                            Hide
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {sorted.length === 0 && <li className="type-meta py-10 text-center">No published posts yet.</li>}
      </ul>
    </section>
  );
}
