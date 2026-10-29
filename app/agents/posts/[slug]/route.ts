import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { SITE_URL, htmlToMarkdown } from "@/lib/post-markdown";
import { sanitizePostHtml } from "@/lib/sanitize-server";

// A published post as Markdown, for agents: a short header, then the body.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await fetchQuery(api.posts.getPostBySlug, { slug });
  if (!post || (post.status !== undefined && post.status !== "published")) {
    return new Response("Not found\n", { status: 404, headers: { "Content-Type": "text/plain" } });
  }

  const date = new Date(post.publishAt ?? post._creationTime).toISOString().slice(0, 10);
  const body = htmlToMarkdown(sanitizePostHtml(post.contentHtml || `<p>${post.body}</p>`));
  const markdown = `---
title: ${JSON.stringify(post.title)}
subtitle: ${JSON.stringify(post.subtitle ?? "")}
author: ${JSON.stringify(post.authorName)}
date: ${date}
topic: ${JSON.stringify(post.topic)}
url: ${SITE_URL}/posts/${post.slug}
---

# ${post.title}

${body}
`;
  return new Response(markdown, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
