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
  UserX,
  Loader2,
} from "lucide-react";
import { useState, useTransition } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";
import { AnimatePresence, motion } from "framer-motion";
import Footer from "@/components/web/Footer";
import type { Id } from "@/convex/_generated/dataModel";

export default function AdminPage() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const [isPending, startTransition] = useTransition();
  const isAdmin = useQuery(api.auth.getIsAdmin, isAuthenticated ? {} : "skip");
  const posts = useQuery(api.posts.getPosts);
  const users = useQuery(api.auth.listUsersForAdmin, isAdmin ? {} : "skip");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [visibilityTarget, setVisibilityTarget] = useState<{
    id: string;
    title: string;
    nextStatus: "published" | "hidden";
  } | null>(null);
  const [banTarget, setBanTarget] = useState<{
    userId: string;
    email: string;
    name?: string;
  } | null>(null);

  const deletePost = useMutation(api.posts.deletePost);
  const updatePost = useMutation(api.posts.updatePost);
  const banUserByAdmin = useMutation(api.auth.banUserByAdmin);

  // Show 404 immediately for unauthenticated users — no loading state
  if (!authLoading && !isAuthenticated) notFound();
  if (isAdmin !== undefined && !isAdmin) notFound();

  if (!posts || isAdmin === undefined) {
    return null;
  }

  async function handleDeletePost() {
    if (!deleteTarget) return;
    startTransition(async () => {
      try {
        await deletePost({ postId: deleteTarget.id as Id<"posts"> });
        showSuccessToast("Post deleted successfully");
        setDeleteTarget(null);
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : "Failed to delete post");
        setDeleteTarget(null);
      }
    });
  }

  async function handleBanUser() {
    if (!banTarget) return;
    startTransition(async () => {
      try {
        await banUserByAdmin({
          userId: banTarget.userId,
          email: banTarget.email,
          reason: "Violation of platform policies",
        });
        showSuccessToast(
          banTarget.name
            ? `${banTarget.name} has been permanently banned`
            : `${banTarget.email} has been permanently banned`
        );
        setBanTarget(null);
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : "Failed to ban user");
        setBanTarget(null);
      }
    });
  }

  async function handleToggleVisibility() {
    if (!visibilityTarget) return;
    startTransition(async () => {
      try {
        await updatePost({
          postId: visibilityTarget.id as Id<"posts">,
          status: visibilityTarget.nextStatus,
        });
        showSuccessToast(
          visibilityTarget.nextStatus === "published" ? "Post published" : "Post hidden"
        );
        setVisibilityTarget(null);
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : "Failed to update post");
        setVisibilityTarget(null);
      }
    });
  }

  const published = posts.filter((p) => (p.status || "published") === "published").length;
  const hidden = posts.filter((p) => p.status === "hidden").length;

  return (
    <>
      {/* Admin Decision Modals */}
      <AnimatePresence>
        {banTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
            onClick={() => setBanTarget(null)}
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
                  <h2 className="text-base font-semibold text-foreground">Ban user</h2>
                  <p className="text-sm text-paragraph mt-1">
                    Confirm permanent ban for&nbsp;
                    <span className="font-medium text-foreground">
                      {banTarget.name || banTarget.email}
                    </span>
                    . This will revoke access immediately.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="secondary" onClick={() => setBanTarget(null)} disabled={isPending}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleBanUser} disabled={isPending}>
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  <span>Confirm Ban</span>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {visibilityTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
            onClick={() => setVisibilityTarget(null)}
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
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950 shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-foreground">
                    {visibilityTarget.nextStatus === "hidden" ? "Hide post" : "Publish post"}
                  </h2>
                  <p className="text-sm text-paragraph mt-1">
                    Confirm you want to&nbsp;
                    <span className="font-medium text-foreground">
                      {visibilityTarget.nextStatus === "hidden" ? "hide" : "publish"}
                    </span>
                    &nbsp;
                    <span className="font-medium text-foreground">"{visibilityTarget.title}"</span>.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => setVisibilityTarget(null)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleToggleVisibility}
                  disabled={isPending}
                  variant={visibilityTarget.nextStatus === "hidden" ? "destructive" : "default"}
                >
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  <span>
                    Confirm {visibilityTarget.nextStatus === "hidden" ? "Hide" : "Publish"}
                  </span>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

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
                    Are you sure you want to delete&nbsp;
                    <span className="font-medium text-foreground">"{deleteTarget.title}"</span>?
                    This will also remove all its comments. This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeletePost} disabled={isPending}>
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  <span>Delete Post</span>
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Users</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!users || users.length === 0 ? (
                <div className="text-center py-12 text-paragraph text-sm">No users found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-bold text-black dark:text-white">
                          Name
                        </th>
                        <th className="text-left py-3 px-4 font-bold text-black dark:text-white">
                          Email
                        </th>
                        <th className="text-left py-3 px-4 font-bold text-black dark:text-white">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 font-bold text-black dark:text-white hidden md:table-cell">
                          Joined
                        </th>
                        <th className="py-3 px-4" />
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user, i) => (
                        <tr
                          key={user._id}
                          className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                        >
                          <td className="py-3 px-4 font-medium">{user.name || "Unnamed user"}</td>
                          <td className="py-3 px-4">{user.email}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                user.isAdmin
                                  ? "bg-[#EAF5FF] text-[#0068D6] dark:bg-[#0F233D] dark:text-[#52A8FF]"
                                  : user.isBanned
                                    ? "bg-[#FFEAEA] text-[#CB2A2E] dark:bg-[#3B1618] dark:text-[#FF6166]"
                                    : "bg-[#EAFAEA] text-[#287A3A] dark:bg-[#0F2E18] dark:text-[#62C073]"
                              }`}
                            >
                              {user.isAdmin ? "Admin" : user.isBanned ? "Banned" : "Active"}
                            </span>
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell text-black dark:text-white">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              {/* BAN ACTION */}
                              {!user.isAdmin && !user.isBanned && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  aria-label={`Ban user ${user.email}`}
                                  onClick={() =>
                                    setBanTarget({
                                      userId: user._id,
                                      email: user.email,
                                      name: user.name || undefined,
                                    })
                                  }
                                  disabled={isPending}
                                  className="h-8 px-3"
                                >
                                  <UserX className="h-3.5 w-3.5" />
                                </Button>
                              )}
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
                                  setVisibilityTarget({
                                    id: post._id,
                                    title: post.title,
                                    nextStatus:
                                      (post.status || "published") === "published"
                                        ? "hidden"
                                        : "published",
                                  })
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
