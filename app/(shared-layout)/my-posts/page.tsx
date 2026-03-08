"use client";

import { useEffect, useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Loader2,
  Trash2,
  Plus,
  BookText,
  Pencil,
  Calendar,
  ClockFading,
  BookType,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Footer from "@/components/web/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";
import { deletePostAction } from "@/app/actions";

export default function MyPostsPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  const user = useQuery(api.auth.getCurrentUser, isAuthenticated ? undefined : "skip");
  const posts = useQuery(api.posts.getPosts, isAuthenticated ? undefined : "skip");

  // Delete modal state
  const [pendingDelete, setPendingDelete] = useState<{ _id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
  const userPosts = postsReady ? posts.filter((post) => post.authorId === user._id) : [];

  return (
    <div className="flex flex-col w-full pt-20 max-w-3xl mx-auto px-4">
      {/* ── Delete confirmation modal ── */}
      {pendingDelete && (
        <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 min-w-[320px]">
          <div className="bg-white dark:bg-[#111] rounded-2xl shadow-2xl max-w-sm w-full p-8 flex flex-col gap-6">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-destructive">Delete post?</h2>
              <p className="text-sm text-paragraph leading-relaxed">
                This will permanently delete&nbsp;
                <span className="font-semibold text-black dark:text-white">
                  &quot;{pendingDelete.title}&quot;.
                </span>
                <br />
                This action cannot be undone.
              </p>
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

      <div className="w-full space-y-6">
        <div className="flex flex-col items-start justify-center">
          <h1 className="text-4xl font-extrabold text-primary mt-6">My Posts</h1>
          <div className="text-paragraph text-xl pt-4">
            {!postsReady ? (
              <Skeleton className="h-4 w-56 mt-3" />
            ) : userPosts.length === 0 ? (
              "You haven't created any posts yet."
            ) : (
              `You have created ${userPosts.length} post${userPosts.length !== 1 ? "s" : ""}.`
            )}
          </div>
        </div>

        {!postsReady ? (
          <div className="grid gap-6">
            {[1, 2].map((i) => (
              <Skeleton
                key={i}
                className="overflow-hidden flex flex-col sm:flex-row w-full h-full px-3 sm:px-4 py-6 rounded-2xl"
              >
                <div className="relative w-full h-48 sm:w-1/3 flex-shrink-0">
                  <div className="flex w-full h-full bg-[#EAEAEA] dark:bg-[#1E1E1E] rounded-md" />
                </div>
                <div className="flex flex-col w-full h-full px-3">
                  <div className="flex flex-col w-full h-full sm:px-8 pt-12 pb-3 sm:pt-auto sm:pb-auto sm:py-6 gap-4">
                    <div className="flex flex-col flex-1 space-y-3">
                      <div className="h-8 w-full bg-[#EAEAEA] dark:bg-[#1E1E1E] rounded" />
                      <div className="h-4 w-full bg-[#EAEAEA] dark:bg-[#1E1E1E] rounded" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3].map((j) => (
                        <div key={j} className="flex gap-2">
                          <div className="h-5 w-5 bg-[#EAEAEA] dark:bg-[#1E1E1E] rounded-full" />
                          <div className="h-5 w-16 bg-[#EAEAEA] dark:bg-[#1E1E1E] rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4 sm:px-3 border-t border-[#D9D9D9] dark:border-[#3A3A3A]">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="h-7 w-18 bg-[#EAEAEA] dark:bg-[#1E1E1E] rounded" />
                    ))}
                  </div>
                </div>
              </Skeleton>
            ))}
          </div>
        ) : userPosts.length === 0 ? (
          <Card className="text-center py-52 sm:py-[106px]">
            <CardContent className="space-y-4">
              <p className="text-lg font-medium">No posts yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {userPosts.map((post, i) => (
              <Card
                key={post._id}
                className="overflow-hidden flex flex-col sm:flex-row px-3 sm:px-4"
              >
                <div className="relative w-full h-48 sm:h-auto sm:w-1/3 flex-shrink-0">
                  <Image
                    src={post.imageUrl ?? ""}
                    alt="post image"
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    priority={i === 0}
                    loading={i === 0 ? "eager" : "lazy"}
                    fetchPriority="high"
                    className="object-cover rounded-md"
                  />
                </div>

                <div className="flex flex-col flex-1 min-w-0">
                  <CardContent className="flex-1 pt-6 pb-4 px-4">
                    <div className="space-y-2">
                      <h2 className="text-xl font-bold text-black dark:text-white truncate">
                        {post.title}
                      </h2>
                      <p className="text-sm text-paragraph truncate">{post.subtitle}</p>
                      <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-paragraph">
                        <div className="flex gap-1 items-center text-black dark:text-white">
                          <Calendar className="size-4" />
                          <p>{new Date(post._creationTime ?? 0).toLocaleDateString("en-US")}</p>
                        </div>
                        <div className="flex gap-1 items-center">
                          <BookType className="size-4 text-black dark:text-white" />
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {post.topic}
                          </span>
                        </div>
                        <div className="flex gap-1 items-center text-black dark:text-white">
                          <ClockFading className="size-4" />
                          <p>{post.minRead} min read</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex flex-wrap gap-2 pt-4 px-2.5 sm:px-6 border-t border-[#D9D9D9] dark:border-[#3A3A3A]">
                    <Link
                      href={`/posts/${post.slug}`}
                      className={buttonVariants({ variant: "secondary", size: "sm" })}
                    >
                      <BookText className="size-3" />
                      View
                    </Link>
                    <Link
                      href={`/edit/${post.slug}`}
                      className={buttonVariants({ variant: "secondary", size: "sm" })}
                    >
                      <Pencil className="size-3" />
                      Edit
                    </Link>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setPendingDelete({ _id: post._id, title: post.title })}
                      className="h-7"
                    >
                      <Trash2 className="size-3" />
                      Delete
                    </Button>
                  </CardFooter>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Footer />
      </div>
    </div>
  );
}
