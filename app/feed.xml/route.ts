import { cacheLife, cacheTag } from "next/cache";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { SITE_URL, escapeXml } from "@/lib/post-markdown";

// RSS 2.0 for published posts, newest first (#23). Refreshes with the `blog` cache tag.
async function buildFeed() {
  "use cache";
  cacheLife("hours");
  cacheTag("blog");

  const posts = (await fetchQuery(api.posts.getPublishedPosts)).slice(0, 50);
  const items = posts
    .filter((post) => post.slug)
    .map((post) => {
      const url = `${SITE_URL}/posts/${post.slug}`;
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(post.subtitle ?? "")}</description>
      <category>${escapeXml(post.topic)}</category>
      <author>noreply@thewebroom.alxpro.com (${escapeXml(post.authorName)})</author>
      <pubDate>${new Date(post.publishAt ?? post._creationTime).toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>The Web Room</title>
    <link>${SITE_URL}</link>
    <description>A community for writing about web architecture, UI engineering, AI and productivity, with an AI assistant when you want one.</description>
    <language>en</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
}

export async function GET() {
  return new Response(await buildFeed(), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
