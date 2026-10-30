"use client";

import { useEffect, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Footer from "@/components/web/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";
import { deletePostAction, publishPostAction } from "@/app/actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatPublishAt } from "@/components/web/SchedulePicker";
import { ScheduleDialog } from "@/components/web/ScheduleDialog";
import type { Id } from "@/convex/_generated/dataModel";

export default function MyPostsPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  const user = useQuery(api.auth.getCurrentUser, isAuthenticated ? undefined : "skip");
  const posts = useQuery(api.posts.getMyPosts, isAuthenticated ? {} : "skip");

  // Delete modal state
  const [pendingDelete, setPendingDelete] = useState<{ _id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Scheduling (#60): posts picked for the schedule dialog, in the order picked.
  const [picked, setPicked] = useState<Id<"posts">[]>([]);
  const [scheduling, setScheduling] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const unschedulePost = useMutation(api.scheduledPosts.unschedulePost);

  const togglePicked = (postId: Id<"posts">) =>
    setPicked((prev) => (prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]));

  const unschedule = async (postId: Id<"posts">) => {
    try {
      await unschedulePost({ postId });
      showSuccessToast("Back to drafts");
    } catch (error) {
      showErrorToast((error as { data?: string }).data ?? "Failed to unschedule");
    }
  };

  // Publishing now needs a finished post; a thin draft goes to the editor instead.
  const publishNow = async (post: { _id: Id<"posts">; slug?: string; status?: string; body?: string }) => {
    if (!post.slug) return;
    if ((post.body ?? "").trim().length < 200) {
      showErrorToast("Finish this draft in the editor first");
      router.push(`/edit/${post.slug}`);
      return;
    }
    setPublishing(post._id);
    const result = await publishPostAction(post._id, post.slug, post.status === "scheduled");
    setPublishing(null);
    if (result.ok) showSuccessToast("Published");
    else showErrorToast(result.message);
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

      {scheduling && (
        <ScheduleDialog
          posts={picked.flatMap((id) => {
            const post = posts?.find((p) => p._id === id);
            return post ? [{ _id: post._id, title: post.title, publishAt: post.publishAt }] : [];
          })}
          onClose={() => setScheduling(false)}
          onScheduled={() => {
            setScheduling(false);
            setPicked([]);
          }}
        />
      )}

      <div className="w-full">
        <div className="flex items-baseline justify-between gap-4 py-10">
          <h1 className="type-display">My posts</h1>
          {postsReady && userPosts.length > 0 && <p className="type-meta">{userPosts.length}</p>}
        </div>

        {picked.length > 0 && (
          <div className="sticky top-20 z-10 flex items-center justify-between gap-3 rounded-full border bg-white/90 px-4 py-2 backdrop-blur dark:bg-black/90">
            <p className="type-meta">{picked.length} picked</p>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setPicked([])}>Clear</Button>
              <Button size="sm" onClick={() => setScheduling(true)}>Schedule</Button>
            </div>
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
            {userPosts.map((post) => {
              const status = post.status || "published";
              const schedulable = status === "draft" || status === "scheduled";
              const date =
                status === "scheduled" && post.publishAt
                  ? `Goes out ${formatPublishAt(post.publishAt)}`
                  : new Date(post.publishAt ?? post._creationTime ?? 0).toLocaleDateString("en-US");
              return (
                <article key={post._id} className="relative divider-dashed-fade-bottom flex gap-3 py-5">
                  {schedulable && (
                    <input
                      type="checkbox"
                      aria-label={`Pick ${post.title}`}
                      checked={picked.includes(post._id)}
                      onChange={() => togglePicked(post._id)}
                      className="mt-1.5 size-4 shrink-0 cursor-pointer accent-black dark:accent-white"
                    />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:gap-12">
                    <div className="min-w-0 flex-1">
                      <h2 className="type-heading line-clamp-1 break-all">{post.title}</h2>
                      <p className="type-meta line-clamp-1 break-all">{post.subtitle || "No subtitle yet"}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2">
                        <StatusBadge status={status} />
                        <span className="type-meta text-xs">{date}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-2 sm:w-[140px] sm:items-center">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          {post.topic}
                        </span>
                        <span className="type-meta whitespace-nowrap">{post.minRead} min</span>
                      </div>
                      <div className="-ml-2 flex items-center sm:ml-0">
                        {status === "published" && (
                          <Link href={`/posts/${post.slug}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                            View
                          </Link>
                        )}
                        <Link href={`/edit/${post.slug}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                          Edit
                        </Link>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setPendingDelete({ _id: post._id, title: post.title })}
                        >
                          Delete
                        </Button>
                      </div>
                      {schedulable && (
                        <div className="-ml-2 flex items-center sm:ml-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={publishing === post._id}
                            onClick={() => publishNow(post)}
                          >
                            {publishing === post._id && <Loader2 className="size-4 animate-spin" />}
                            Publish
                          </Button>
                          {status === "scheduled" && (
                            <Button variant="ghost" size="sm" onClick={() => unschedule(post._id)}>
                              Unschedule
                            </Button>
                          )}
                        </div>
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
