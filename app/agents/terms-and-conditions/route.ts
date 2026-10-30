import { pageToMarkdown } from "@/lib/page-markdown";

// /terms-and-conditions as Markdown, for agents.
export async function GET(request: Request) {
  const markdown = await pageToMarkdown(request.url, "/terms-and-conditions");
  if (!markdown) return new Response("Not found\n", { status: 404, headers: { "Content-Type": "text/plain" } });
  return new Response(`${markdown}\n`, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
