import { cacheLife, cacheTag } from "next/cache";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export async function getCachedPost(slug: string) {
  "use cache";
  cacheLife("days");
  cacheTag("blog");
  cacheTag(`post-${slug}`);
  
  const res = await fetch(
    `${process.env.CONVEX_SITE_URL}/post-by-slug?slug=${encodeURIComponent(slug)}`
  );
  if (!res.ok) return null;
  return res.json() as Promise<{
    title: string;
    subtitle: string;
    body: string;
    authorName: string;
    _id: string;
    _creationTime: number;
    topic: string;
    minRead: number;
    imageUrl: string | null;
    contentHtml: string | null;
    authorId: string;
    slug: string;
  }>;
}

export async function getCachedComments(postId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(`comments-${postId}`);
  return fetchQuery(api.comment.getCommentsByPostId, { postId: postId as Id<"posts"> });
}
