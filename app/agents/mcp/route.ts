import { mcpMarkdown } from "@/lib/agent-docs";

// The MCP guide (/mcp) as Markdown, for agents.
export function GET() {
  return new Response(mcpMarkdown(), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
