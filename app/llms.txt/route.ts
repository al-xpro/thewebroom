import { cacheLife, cacheTag } from "next/cache";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { SITE_URL } from "@/lib/post-markdown";

// The index agents read first (llmstxt.org): what the site is, and every post with a link
// to its Markdown version.
async function buildIndex() {
  "use cache";
  cacheLife("hours");
  cacheTag("blog");

  const posts = await fetchQuery(api.posts.getPublishedPosts);
  const lines = posts
    .filter((post) => post.slug)
    .map(
      (post) =>
        `- [${post.title}](${SITE_URL}/agents/posts/${post.slug}): ${post.subtitle ?? post.topic}`
    )
    .join("\n");

  return `# The Web Room

> A community for writing about web architecture, UI engineering, AI and productivity, with an AI assistant when you want one.

Each post is available as Markdown at \`/agents/posts/<slug>\`. The RSS feed is at ${SITE_URL}/feed.xml.

## Posts

${lines}
`;
}

export async function GET() {
  return new Response(await buildIndex(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
