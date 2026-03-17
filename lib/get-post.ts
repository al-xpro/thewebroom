import { cacheLife, cacheTag } from "next/cache";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export async function getCachedPost(slug: string) {
  "use cache";
  cacheLife("seconds");
  cacheTag(`post-${slug}`);
  return fetchQuery(api.posts.getPostBySlug, { slug });
}

export async function getCachedComments(postId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(`comments-${postId}`);
  return fetchQuery(api.comment.getCommentsByPostId, { postId: postId as Id<"posts"> });
}