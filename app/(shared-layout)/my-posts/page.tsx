"use client";

import { useEffect, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button, buttonVariants } from "@/components/ui/button";
import { Loader2, MoreHorizontal } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "scheduled", label: "Scheduled" },
  { key: "published", label: "Published" },
  { key: "hidden", label: "Hidden" },
] as const;
type Tab = (typeof TABS)[number]["key"];

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
  const [tab, setTab] = useState<Tab>("all");
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
  const statusOf = (post: { status?: string }) => (post.status === "flagged" ? "hidden" : post.status || "published");
  const counts = Object.fromEntries(
    TABS.map((t) => [t.key, t.key === "all" ? userPosts.length : userPosts.filter((p) => statusOf(p) === t.key).length])
  ) as Record<Tab, number>;
  const shown = tab === "all" ? userPosts : userPosts.filter((post) => statusOf(post) === tab);

  return (
    <div className="flex flex-col w-full pt-20 max-w-3xl mx-auto px-4">
      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && !isDeleting && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="type-heading">Delete post?</AlertDialogTitle>
            <AlertDialogDescription>&quot;{pendingDelete?.title}&quot; is deleted for good.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="ghost" disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteConfirm();
              }}
            >
              {isDeleting && <Loader2 className="size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      <div className="flex items-end justify-between gap-4 py-10">
        <h1 className="type-display">My posts</h1>
        <Link href="/create" className={buttonVariants({ size: "sm" })}>
          Write
        </Link>
      </div>

      {postsReady && userPosts.length > 0 && (
        <div className="flex flex-wrap gap-1 pb-4" role="tablist" aria-label="Filter by status">
          {TABS.filter((t) => t.key === "all" || counts[t.key] > 0).map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-sm",
                tab === t.key ? "bg-black text-white dark:bg-white dark:text-black" : "text-[#666666] hover:text-black dark:text-[#A0A0A0] dark:hover:text-white"
              )}
            >
              {t.label}
              <span className="text-xs tabular-nums opacity-60">{counts[t.key]}</span>
            </button>
          ))}
        </div>
      )}

      {picked.length > 0 && (
        <div className="sticky top-20 z-10 mb-2 flex items-center justify-between gap-3 rounded-full border bg-white/90 px-4 py-2 backdrop-blur dark:bg-black/90">
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
            <div key={i} className="relative divider-fade-top space-y-2 py-5">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : userPosts.length === 0 ? (
        <div className="relative divider-fade-top flex flex-col items-center gap-2 py-20 text-center">
          <p className="type-heading">Nothing here yet</p>
          <p className="type-meta">Your drafts, scheduled and published posts appear here.</p>
        </div>
      ) : (
        <ul>
          {shown.map((post) => {
            const status = statusOf(post);
            const schedulable = status === "draft" || status === "scheduled";
            const date =
              status === "scheduled" && post.publishAt
                ? `Goes out ${formatPublishAt(post.publishAt)}`
                : new Date(post.publishAt ?? post._creationTime ?? 0).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
            const href = status === "published" ? `/posts/${post.slug}` : `/edit/${post.slug}`;
            return (
              <li key={post._id} className="relative divider-fade-top grid grid-cols-[1.25rem_1fr_auto] items-start gap-x-3 py-4">
                <span className="pt-1">
                  {schedulable && (
                    <input
                      type="checkbox"
                      aria-label={`Pick ${post.title} to schedule`}
                      checked={picked.includes(post._id)}
                      onChange={() => togglePicked(post._id)}
                      className="size-4 cursor-pointer accent-black dark:accent-white"
                    />
                  )}
                </span>
                <Link href={href} className="group min-w-0">
                  <h2 className="type-heading truncate group-hover:underline underline-offset-4">{post.title}</h2>
                  <p className="type-meta truncate">{post.subtitle || "No subtitle yet"}</p>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1.5 text-xs font-light text-[#666666] dark:text-[#A0A0A0]">
                    <StatusBadge status={status} />
                    <span aria-hidden>·</span>
                    <span>{date}</span>
                    <span aria-hidden>·</span>
                    <span>{post.topic}</span>
                    <span aria-hidden>·</span>
                    <span>{post.minRead ?? 1} min</span>
                  </p>
                </Link>
                <div className="flex items-center gap-1">
                  {schedulable && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={publishing === post._id}
                      onClick={() => void publishNow(post)}
                      className="hidden sm:inline-flex"
                    >
                      {publishing === post._id && <Loader2 className="size-4 animate-spin" />}
                      Publish
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${post.title}`}>
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-40">
                      {status === "published" && (
                        <DropdownMenuItem asChild>
                          <Link href={`/posts/${post.slug}`}>View</Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link href={`/edit/${post.slug}`}>Edit</Link>
                      </DropdownMenuItem>
                      {schedulable && (
                        <>
                          <DropdownMenuItem onSelect={() => void publishNow(post)}>Publish now</DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              setPicked([post._id]);
                              setScheduling(true);
                            }}
                          >
                            Schedule…
                          </DropdownMenuItem>
                        </>
                      )}
                      {status === "scheduled" && (
                        <DropdownMenuItem onSelect={() => void unschedule(post._id)}>Back to drafts</DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setPendingDelete({ _id: post._id, title: post.title })}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Footer />
    </div>
  );
}
