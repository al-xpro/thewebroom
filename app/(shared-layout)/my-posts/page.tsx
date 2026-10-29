"use client";

import { useEffect, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Loader2, CalendarRange } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FadeImage } from "@/components/ui/fade-image";
import Footer from "@/components/web/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";
import { deletePostAction } from "@/app/actions";
import { getStatusBadgeClassName } from "@/lib/get-status-badge";
import { SchedulePicker, formatPublishAt } from "@/components/web/SchedulePicker";
import { SpreadScheduleDialog } from "@/components/web/SpreadScheduleDialog";
import type { Id } from "@/convex/_generated/dataModel";

export default function MyPostsPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  const user = useQuery(api.auth.getCurrentUser, isAuthenticated ? undefined : "skip");
  const posts = useQuery(api.posts.getMyPosts, isAuthenticated ? {} : "skip");

  // Delete modal state
  const [pendingDelete, setPendingDelete] = useState<{ _id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Scheduling (#60): drafts picked for "Spread over a period", in the order picked.
  const [picked, setPicked] = useState<Id<"posts">[]>([]);
  const [spreading, setSpreading] = useState(false);
  const schedulePost = useMutation(api.scheduledPosts.schedulePost);
  const unschedulePost = useMutation(api.scheduledPosts.unschedulePost);

  const togglePicked = (postId: Id<"posts">) =>
    setPicked((prev) => (prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]));

  const reschedule = async (postId: Id<"posts">, publishAt: number) => {
    try {
      await schedulePost({ postId, publishAt });
      showSuccessToast(`Scheduled for ${formatPublishAt(publishAt)}`);
    } catch (error) {
      showErrorToast((error as { data?: string }).data ?? "Failed to schedule the post");
    }
  };

  const moveToDraft = async (postId: Id<"posts">) => {
    try {
      await unschedulePost({ postId });
      showSuccessToast("Moved back to drafts");
    } catch (error) {
      showErrorToast((error as { data?: string }).data ?? "Failed to move the post to drafts");
    }
  };

  // Lock scroll when modal is open
  useEffect(() => {
    if (pendingDelete) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [pendingDelete]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/auth/login");
  }, [isAuthenticated, isLoading, router]);

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      // Server action revalidates the "blog" cache tag so the post
      // disappears from the posts page immediately after deletion.
      await deletePostAction(pendingDelete._id);
      showSuccessToast("Post deleted successfully");
      setPendingDelete(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to delete post";
      showErrorToast(message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading || !isAuthenticated) return null;

  const postsReady = posts !== undefined && user != null;
  const userPosts = postsReady ? posts : [];

  return (
    <div className="flex flex-col w-full pt-20 max-w-3xl mx-auto px-4">
      {/* ── Delete confirmation modal ── */}
      {pendingDelete && (
        <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 min-w-[320px]">
          <div className="bg-white dark:bg-black border rounded-2xl max-w-sm w-full p-6 flex flex-col gap-6">
            <div className="space-y-1">
              <h2 className="type-heading">Delete post?</h2>
              <p className="type-meta">&quot;{pendingDelete.title}&quot; is deleted for good.</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setPendingDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting && <Loader2 className="size-4 animate-spin" />}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {spreading && (
        <SpreadScheduleDialog
          drafts={picked.flatMap((id) => {
            const post = posts?.find((p) => p._id === id);
            return post ? [{ _id: post._id, title: post.title }] : [];
          })}
          onClose={() => setSpreading(false)}
          onScheduled={() => {
            setSpreading(false);
            setPicked([]);
          }}
        />
      )}

      <div className="w-full">
        <div className="flex items-baseline justify-between gap-4 py-10">
          <h1 className="type-display">My posts</h1>
          {postsReady && userPosts.length > 0 && <p className="type-meta">{userPosts.length}</p>}
        </div>

        {postsReady && userPosts.some((post) => post.status === "draft") && (
          <div className="relative divider-fade-top flex items-center justify-between gap-3 py-4">
            <p className="type-meta">
              {picked.length === 0 ? "Pick drafts to spread them out." : `${picked.length} picked`}
            </p>
            <Button size="sm" variant="outline" disabled={picked.length === 0} onClick={() => setSpreading(true)}>
              <CalendarRange className="size-4" />
              Spread
            </Button>
          </div>
        )}

        {!postsReady ? (
          <div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="relative divider-fade-top flex gap-4 py-6">
                <Skeleton className="size-20 sm:size-24 rounded-md" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : userPosts.length === 0 ? (
          <div className="relative divider-fade-top py-20 flex flex-col items-center gap-4">
            <p className="type-meta">No posts yet.</p>
            <Link href="/create" className={buttonVariants({ size: "sm" })}>
              Write
            </Link>
          </div>
        ) : (
          <div>
            {userPosts.map((post, i) => {
              const status = post.status || "published";
              const date =
                status === "scheduled" && post.publishAt
                  ? `Goes out ${formatPublishAt(post.publishAt)}`
                  : new Date(post.publishAt ?? post._creationTime ?? 0).toLocaleDateString("en-US");
              return (
                <article key={post._id} className="relative divider-fade-top flex gap-4 sm:gap-6 py-6">
                  <div className="relative size-20 sm:size-24 shrink-0 overflow-hidden rounded-md bg-[#EDEDED] dark:bg-[#0A0A0A]">
                    {post.imageUrl && (
                      <FadeImage
                        src={post.imageUrl}
                        alt=""
                        fill
                        sizes="96px"
                        priority={i === 0}
                        className="object-cover"
                      />
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="type-heading truncate">{post.title}</h2>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClassName(post.status)}`}>
                        {status}
                      </span>
                    </div>
                    <p className="type-meta truncate">
                      {date} · {post.topic} · {post.minRead} min
                    </p>

                    <div className="flex flex-wrap items-center gap-1 -ml-3 pt-1">
                      {status === "published" && (
                        <Link href={`/posts/${post.slug}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                          View
                        </Link>
                      )}
                      <Link href={`/edit/${post.slug}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                        Edit
                      </Link>
                      {(status === "draft" || status === "scheduled") && (
                        <SchedulePicker
                          initial={post.publishAt}
                          confirmLabel={status === "scheduled" ? "Reschedule" : "Schedule"}
                          onConfirm={(publishAt) => reschedule(post._id, publishAt)}
                        >
                          <Button variant="ghost" size="sm">
                            {status === "scheduled" ? "Reschedule" : "Schedule"}
                          </Button>
                        </SchedulePicker>
                      )}
                      {status === "scheduled" && (
                        <Button variant="ghost" size="sm" onClick={() => moveToDraft(post._id)}>
                          Draft
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setPendingDelete({ _id: post._id, title: post.title })}
                      >
                        Delete
                      </Button>
                      {status === "draft" && (
                        <label className="ml-auto inline-flex items-center gap-2 type-meta cursor-pointer">
                          <input
                            type="checkbox"
                            checked={picked.includes(post._id)}
                            onChange={() => togglePicked(post._id)}
                            className="size-4 accent-[var(--primary)] cursor-pointer"
                          />
                          Pick{picked.includes(post._id) ? ` #${picked.indexOf(post._id) + 1}` : ""}
                        </label>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <Footer />
      </div>
    </div>
  );
}
