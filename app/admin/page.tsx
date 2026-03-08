"use client";

import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  EyeOffIcon,
  AlertTriangle,
  LibraryBig,
} from "lucide-react";
import { useState, useTransition } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";
import { AnimatePresence, motion } from "framer-motion";
import Footer from "@/components/web/Footer";

export default function AdminPage() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const [isPending, startTransition] = useTransition();
  const currentUser = useQuery(api.auth.getCurrentUser, isAuthenticated ? undefined : "skip");
  const posts = useQuery(api.posts.getPosts);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const deletePost = useMutation(api.posts.deletePost);
  const updatePost = useMutation(api.posts.updatePost);

  const isAdmin = currentUser?._id === process.env.NEXT_PUBLIC_ADMIN_ID;

  // Show 404 immediately for unauthenticated users — no loading state
  if (!authLoading && !isAuthenticated) notFound();
  if (currentUser !== undefined && !isAdmin) notFound();

  if (!posts || currentUser === undefined) {
    return null;
  }

  async function handleDeletePost() {
    if (!deleteTarget) return;
    startTransition(async () => {
      try {
        await deletePost({ postId: deleteTarget.id as any });
        showSuccessToast("Post deleted successfully");
        setDeleteTarget(null);
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : "Failed to delete post");
        setDeleteTarget(null);
      }
    });
  }

  async function handleToggleVisibility(postId: string, currentStatus: string) {
    const newStatus = currentStatus === "published" ? "hidden" : "published";
    startTransition(async () => {
      try {
        await updatePost({ postId: postId as any, status: newStatus as "published" | "hidden" });
        showSuccessToast(newStatus === "published" ? "Post published" : "Post hidden");
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : "Failed to update post");
      }
    });
  }

  const published = posts.filter((p) => (p.status || "published") === "published").length;
  const hidden = posts.filter((p) => p.status === "hidden").length;

  return (
    <>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-black border border-border rounded-2xl shadow-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-950 shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-foreground">Delete post</h2>
                  <p className="text-sm text-paragraph mt-1">
                    Are you sure you want to delete{" "}
                    <span className="font-medium text-foreground">"{deleteTarget.title}"</span>?
                    This will also remove all its comments. This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeletePost} disabled={isPending}>
                  {isPending ? "Deleting..." : "Delete post"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col w-full pt-20 max-w-3xl mx-auto px-4 pb-16">
        <div className="text-left mb-10">
          <h1 className="text-4xl font-extrabold text-primary mt-6">Admin Dashboard</h1>
          <p className="text-paragraph text-xl pt-4">Manage all posts and content</p>
        </div>

        <div className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 grid-rows-3 sm:grid-rows-1 grid-cols-1 sm:grid-cols-3">
            {[
              { label: "Total Posts", value: posts.length, icon: LibraryBig },
              { label: "Published", value: published, icon: CheckCircle },
              { label: "Hidden", value: hidden, icon: EyeOffIcon },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-paragraph flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-black dark:text-white">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Posts Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Posts</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {posts.length === 0 ? (
                <div className="text-center py-12 text-paragraph text-sm">No posts yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-bold text-black dark:text-white">
                          Title
                        </th>
                        <th className="text-left py-3 px-4 font-bold text-black dark:text-white hidden sm:table-cell">
                          Author
                        </th>
                        <th className="text-left py-3 px-4 font-bold text-black dark:text-white">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 font-bold text-black dark:text-white hidden md:table-cell">
                          Date
                        </th>
                        <th className="py-3 px-4" />
                      </tr>
                    </thead>
                    <tbody>
                      {posts.map((post, i) => (
                        <tr
                          key={post._id}
                          className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                        >
                          <td className="py-3 px-4 font-medium max-w-[180px]">
                            <Link
                              href={`/posts/${post.slug}`}
                              className="hover:text-primary hover:underline truncate block text-primary"
                            >
                              {post.title}
                            </Link>
                          </td>
                          <td className="py-3 px-4 hidden sm:table-cell text-black dark:text-white">
                            {post.authorName}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                (post.status || "published") === "published"
                                  ? "bg-[#EAFAEA] text-[#287A3A] dark:bg-[#0F2E18] dark:text-[#62C073]"
                                  : "bg-[#FFF4D6] text-[#A35200] dark:bg-[#331C00] dark:text-[#F2A20D]"
                              }`}
                            >
                              {post.status || "published"}
                            </span>
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell text-black dark:text-white">
                            {new Date(post._creationTime).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="secondary"
                                aria-label={
                                  post.status === "published" ? "Hide post" : "Publish post"
                                }
                                onClick={() =>
                                  handleToggleVisibility(post._id, post.status || "published")
                                }
                                disabled={isPending}
                                title={post.status === "published" ? "Hide post" : "Publish post"}
                                className="h-8 w-8 p-0"
                              >
                                {(post.status || "published") === "published" ? (
                                  <EyeOff className="h-3.5 w-3.5" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                aria-label={`Delete post ${post.title}`}
                                onClick={() => setDeleteTarget({ id: post._id, title: post.title })}
                                disabled={isPending}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          <Footer />
        </div>
      </div>
    </>
  );
}
