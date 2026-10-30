import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { SITE_URL } from "@/lib/post-markdown";

// A member's public page (/members/<id>) as Markdown, for agents.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await fetchQuery(api.community.member, { userId: id }).catch(() => null);
  if (!member) return new Response("Not found\n", { status: 404, headers: { "Content-Type": "text/plain" } });

  const posts = member.posts
    .map((post) => {
      const date = new Date(post.publishedAt).toISOString().slice(0, 10);
      return `- [${post.title}](${SITE_URL}/agents/posts/${post.slug}), ${date}, ${post.topic}: ${post.subtitle}`;
    })
    .join("\n");
  const markdown = `# ${member.name}\n\nA writer on The Web Room: ${SITE_URL}/members/${member.id}\n\n## Posts\n\n${posts || "Nothing published yet."}\n`;
  return new Response(markdown, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
