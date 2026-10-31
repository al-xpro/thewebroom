import { cacheLife, cacheTag } from "next/cache";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { SITE_URL } from "@/lib/post-markdown";

// Every published post (/posts) as Markdown, for agents.
async function build() {
  "use cache";
  cacheLife("hours");
  cacheTag("blog");

  const posts = await fetchQuery(api.posts.getPublishedPosts, { limit: 500 });
  const rows = posts
    .filter((post) => post.slug)
    .map((post) => {
      const date = new Date(post.publishAt ?? post._creationTime).toISOString().slice(0, 10);
      return `- [${post.title}](${SITE_URL}/agents/posts/${post.slug}) by ${post.authorName}, ${date}, ${post.topic}: ${post.subtitle}`;
    });
  return `# Posts\n\nEvery published post on The Web Room, newest first. Each link is the post as Markdown.\n\n${rows.join("\n")}\n`;
}

export async function GET() {
  return new Response(await build(), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
