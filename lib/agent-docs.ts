import { AGENT_LIMITS as L } from "@/convex/agentLimits";
import { TOPICS } from "@/convex/topics";
import { SITE_URL } from "@/lib/site-url";

// One source for the rules (/rules) and the MCP guide (/mcp): the pages render it, agents
// read the same text as Markdown (/agents/rules, /agents/mcp) and through the MCP server.

export const MCP_URL = `${SITE_URL}/api/mcp`;

export type RuleSection = { id: string; title: string; intro?: string; rules: string[] };

export const RULES: RuleSection[] = [
  {
    id: "everyone",
    title: "Everyone",
    intro: "For members and for the agents they connect. An agent acts for its member, so its posts are the member's.",
    rules: [
      `Write about one of the topics (${TOPICS.join(", ")}), for people who build for the web.`,
      "Say something you know: what you built, what broke, what you learned. Show the real code.",
      "Credit what you quote or adapt, with a link. Never copy someone else's post.",
      "Disagree with ideas, never with people. No insults, harassment or pile-ons.",
      "No spam: no ads, affiliate links, SEO filler, or the same post twice.",
      "No secrets: never post keys, tokens, passwords or anyone's personal data, even as an example.",
      "No malware, exploits against live systems, or instructions to harm people or services.",
      "Nothing illegal, sexual, hateful or violent.",
    ],
  },
  {
    id: "posts",
    title: "Posts",
    rules: [
      "One idea per post, with a title that says what it is.",
      `A title of ${L.titleMin}–${L.titleMax} characters (letters, numbers, spaces, hyphens) and a subtitle of ${L.subtitleMin}–${L.subtitleMax}.`,
      `A body of ${L.bodyMin.toLocaleString("en")}–${L.bodyMax.toLocaleString("en")} characters, a cover image and a topic before publishing.`,
      "Code blocks short enough to read and complete enough to run.",
      "Write for a person reading it, not for search engines.",
    ],
  },
  {
    id: "agents",
    title: "Agents",
    intro: "What an agent connected with a token can and can't do.",
    rules: [
      "Agents write drafts. A person reads every draft and publishes it in the editor.",
      "Agents never publish, schedule, delete, comment, follow or report, and never touch anyone else's posts.",
      "Agents only change drafts; a published or scheduled post changes in the editor.",
      "Posts written or edited with an agent are marked as AI-assisted.",
      "Don't invent facts, benchmarks, quotes or links. If the agent can't check it, leave it out.",
      "Don't write about the member's private code or data unless they asked for that post.",
      "Keep a token like a password: one per agent, revoked when it's no longer used.",
    ],
  },
  {
    id: "moderation",
    title: "Moderation",
    rules: [
      "Admins can hide posts and comments that break these rules.",
      "Breaking the agent rules revokes the token; serious or repeated cases ban the account.",
      "Members can report a comment; posts are reviewed by the admins.",
    ],
  },
];

export const MCP_TOOLS = [
  { name: "get_rules", text: "These rules and the post format, as Markdown. Agents should read them first." },
  { name: "whoami", text: "The member the token belongs to, and the limits." },
  { name: "list_topics", text: "The topics a post can have." },
  { name: "search_posts", text: "Published posts matching a query, newest first." },
  { name: "read_post", text: "A published post as Markdown, by slug." },
  { name: "list_drafts", text: "The member's drafts." },
  { name: "read_draft", text: "One of the member's drafts as Markdown, by id." },
  { name: "create_draft", text: "A new draft from a title, subtitle, topic and Markdown body." },
  { name: "update_draft", text: "Changes to one of the member's drafts." },
] as const;

export const MCP_LIMITS = [
  { label: "Tokens", value: `${L.tokensPerAccount} per account, each valid ${L.tokenLifetimeDays} days` },
  { label: "Requests", value: `${L.requestsPerHour} an hour per token` },
  { label: "New drafts", value: `${L.draftsPerDay} a day per account` },
  { label: "Draft changes", value: `${L.draftUpdatesPerDay} a day per account` },
  { label: "Title", value: `${L.titleMin}–${L.titleMax} characters` },
  { label: "Subtitle", value: `${L.subtitleMin}–${L.subtitleMax} characters` },
  { label: "Body", value: `up to ${L.bodyMax.toLocaleString("en")} characters; ${L.bodyMin.toLocaleString("en")} to publish` },
];

export const MCP_FORMATTING = [
  { name: "Headings", detail: "## and ###; the title is the post's H1." },
  { name: "Text", detail: "Bold, italic, inline code, links, quotes." },
  { name: "Lists", detail: "Bulleted and numbered." },
  { name: "Code", detail: "Fenced blocks with a language: ```ts, ```css, ```bash." },
  { name: "Tables", detail: "Markdown tables, a few columns." },
  { name: "Not supported", detail: "Images inside the body, raw HTML, scripts, embeds." },
];

export const MCP_CLIENTS = [
  {
    name: "Claude Code",
    language: "bash",
    code: `claude mcp add --transport http thewebroom ${MCP_URL} --header "Authorization: Bearer <token>"`,
  },
  {
    name: "Cursor, VS Code and others",
    language: "json",
    code: JSON.stringify(
      { mcpServers: { thewebroom: { url: MCP_URL, headers: { Authorization: "Bearer <token>" } } } },
      null,
      2
    ),
  },
];

export const MCP_EXAMPLE = `create_draft({
  title: "Streaming forms with server actions",
  subtitle: "What changed when we stopped waiting for the whole response",
  topic: "Web Architecture",
  markdown: "## The problem\\n\\nOur checkout form waited for..."
})`;

export function rulesMarkdown() {
  const sections = RULES.map(
    (section) =>
      `## ${section.title}\n\n${section.intro ? `${section.intro}\n\n` : ""}${section.rules.map((rule) => `- ${rule}`).join("\n")}`
  ).join("\n\n");
  return `# Rules\n\nThe rules members and their agents follow on The Web Room (${SITE_URL}/rules).\n\n${sections}\n`;
}

export function mcpMarkdown() {
  return `# The Web Room MCP server

Connect your own agent (Claude Code, Cursor, any MCP client) to write drafts for your account. A person always publishes.

- Endpoint: ${MCP_URL} (Streamable HTTP, JSON responses)
- Auth: \`Authorization: Bearer <token>\`. Create a token at ${SITE_URL}/mcp while signed in; it's shown once.
- Topics: ${TOPICS.join(", ")}

## Connect

${MCP_CLIENTS.map((client) => `${client.name}:\n\n\`\`\`${client.language}\n${client.code}\n\`\`\``).join("\n\n")}

## Tools

${MCP_TOOLS.map((tool) => `- \`${tool.name}\`: ${tool.text}`).join("\n")}

## Limits

${MCP_LIMITS.map((limit) => `- ${limit.label}: ${limit.value}`).join("\n")}

## Formatting

${MCP_FORMATTING.map((item) => `- ${item.name}: ${item.detail}`).join("\n")}

## Example

\`\`\`ts
${MCP_EXAMPLE}
\`\`\`

${rulesMarkdown().replace(/^# Rules/, "## Rules").replace(/^## (?!Rules)/gm, "### ")}`;
}
