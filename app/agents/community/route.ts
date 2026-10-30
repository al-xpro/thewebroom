import { connection } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { SITE_URL } from "@/lib/post-markdown";

// The community page (/community) as Markdown, for agents.
export async function GET() {
  // Fresh on every request: comments change it as often as posts do.
  await connection();
  const data = await fetchQuery(api.community.overview);
  const writers = data.writers
    .map((writer) => `- [${writer.name}](${SITE_URL}/agents/members/${writer.id}): ${writer.posts} posts (${writer.topics.join(", ")})`)
    .join("\n");
  const topics = data.topics.map((item) => `- ${item.topic}: ${item.posts} posts`).join("\n");
  const lately = data.lately
    .map((item) => {
      const date = new Date(item.at).toISOString().slice(0, 10);
      const verb = item.kind === "post" ? "published" : "commented on";
      return `- ${date}: ${item.actorName} ${verb} [${item.postTitle}](${SITE_URL}/agents/posts/${item.postSlug})`;
    })
    .join("\n");
  const markdown = `# Community

${data.totals.writers} writers, ${data.totals.posts} published posts.

## Writers

${writers || "No one has published yet."}

## Topics

${topics}

## Lately

${lately || "Nothing yet."}
`;
  return new Response(markdown, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
