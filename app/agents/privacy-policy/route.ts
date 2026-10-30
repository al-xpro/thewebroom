import { pageToMarkdown } from "@/lib/page-markdown";

// /privacy-policy as Markdown, for agents.
export async function GET(request: Request) {
  const markdown = await pageToMarkdown(request.url, "/privacy-policy");
  if (!markdown) return new Response("Not found\n", { status: 404, headers: { "Content-Type": "text/plain" } });
  return new Response(`${markdown}\n`, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
