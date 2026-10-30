import { rulesMarkdown } from "@/lib/agent-docs";

// The rules (/rules) as Markdown, for agents.
export function GET() {
  return new Response(rulesMarkdown(), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
