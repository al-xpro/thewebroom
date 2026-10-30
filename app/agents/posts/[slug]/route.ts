import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { postToMarkdown } from "@/lib/post-markdown";

// A published post as Markdown, for agents.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await fetchQuery(api.posts.getPostBySlug, { slug });
  if (!post || (post.status !== undefined && post.status !== "published")) {
    return new Response("Not found\n", { status: 404, headers: { "Content-Type": "text/plain" } });
  }
  return new Response(postToMarkdown(post), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
