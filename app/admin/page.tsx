"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trash2, Eye, EyeOff } from "lucide-react";
import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { notFound } from "next/navigation";
import Link from "next/link";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";

export default function AdminPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const currentUser = useQuery(api.auth.getCurrentUser);
  const posts = useQuery(api.posts.getPosts);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const deletePost = useMutation(api.posts.deletePost);
  const updatePost = useMutation(api.posts.updatePost);

  // Check if user is admin (you'll need to set NEXT_PUBLIC_ADMIN_ID env variable)
  const isAdmin = currentUser?._id === process.env.NEXT_PUBLIC_ADMIN_ID;

  // Show 404 for unauthenticated or non-admin users
  if (currentUser === undefined) {
    // Still loading
    return <div className="py-16 text-center">Loading...</div>;
  }

  if (!currentUser || !isAdmin) {
    notFound();
  }

  async function handleDeletePost(postId: string) {
    if (!confirm("Are you sure you want to delete this post and all its comments?")) return;

    startTransition(async () => {
      try {
        await deletePost({ postId: postId as any });
        showSuccessToast("Post deleted successfully");
        setSelectedPostId(null);
      } catch (error) {
        showErrorToast(
          error instanceof Error ? error.message : "Failed to delete post"
        );
      }
    });
  }

  async function handleToggleVisibility(postId: string, currentStatus: string) {
    const newStatus = currentStatus === "published" ? "hidden" : "published";

    startTransition(async () => {
      try {
        await updatePost({
          postId: postId as any,
          status: newStatus as "published" | "hidden",
        });
        showSuccessToast(
          newStatus === "published" ? "Post published" : "Post hidden"
        );
      } catch (error) {
        showErrorToast(
          error instanceof Error ? error.message : "Failed to update post"
        );
      }
    });
  }

  if (!posts) {
    return (
      <div className="py-12 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Admin Dashboard
        </h1>
        <p className="text-xl text-muted-foreground pt-4">
          Manage all posts and content
        </p>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Total Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{posts.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Published
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {posts.filter((p) => (p.status || "published") === "published").length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Hidden
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {posts.filter((p) => p.status === "hidden").length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Posts Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Title</th>
                    <th className="text-left py-3 px-2">Author</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-left py-3 px-2">Date</th>
                    <th className="text-left py-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post._id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 font-medium">
                        <Link
                          href={`/posts/${post.slug || post._id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {post.title}
                        </Link>
                      </td>
                      <td className="py-3 px-2 text-sm text-muted-foreground">
                        {post.authorId.slice(0, 8)}...
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            (post.status || "published") === "published"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          }`}
                        >
                          {post.status || "published"}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-sm text-muted-foreground">
                        {new Date(post._creationTime).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleToggleVisibility(post._id, post.status || "published")
                            }
                            disabled={isPending}
                            title={
                              post.status === "published"
                                ? "Hide post"
                                : "Publish post"
                            }
                          >
                            {post.status === "published" ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeletePost(post._id)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {posts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No posts yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
