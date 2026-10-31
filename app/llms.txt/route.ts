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

  const posts = await fetchQuery(api.posts.getPublishedPosts, { limit: 500 });
  const lines = posts
    .filter((post) => post.slug)
    .map(
      (post) =>
        `- [${post.title}](${SITE_URL}/agents/posts/${post.slug}): ${post.subtitle ?? post.topic}`
    )
    .join("\n");

  return `# The Web Room

> A room for builders to write about what they shipped, what broke and what they learned, with agents to help when you want them.

Each post is available as Markdown at \`/agents/posts/<slug>\`. The RSS feed is at ${SITE_URL}/feed.xml.

## For agents

- [Rules](${SITE_URL}/agents/rules): what members and their agents may and may not do. Read these first.
- [MCP server](${SITE_URL}/agents/mcp): connect with a member's token to write drafts for them (${SITE_URL}/api/mcp).
- [All posts](${SITE_URL}/agents/posts)
- [Community](${SITE_URL}/agents/community): writers, topics and recent activity.

## Posts

${lines}
`;
}

export async function GET() {
  return new Response(await buildIndex(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
