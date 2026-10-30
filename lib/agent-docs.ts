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
  { label: "Tokens", value: `1 new token a day, ${L.tokensPerAccount} active at most, each valid ${L.tokenLifetimeDays} days` },
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

// A block in the setup guide: a command for the terminal, or a file to create or edit.
export type GuideBlock =
  | { kind: "terminal"; label: string; code: string }
  | { kind: "file"; filename: string; lang: "json" | "ts" | "text"; code: string };

export type GuideStep = { text: string; block?: GuideBlock };

export type McpClient = { id: string; name: string; intro: string; steps: GuideStep[]; check: string };

const TOKEN = "twr_your_token";
const json = (value: unknown) => JSON.stringify(value, null, 2);

export const MCP_CLIENTS: McpClient[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    intro: "One command adds the server for every project on this computer.",
    steps: [
      {
        text: "Keep the token in your shell, so it isn't pasted into commands you share:",
        block: { kind: "terminal", label: "shell", code: `export THEWEBROOM_TOKEN=${TOKEN}` },
      },
      {
        text: "Add the server. `--scope user` makes it available in every project; leave it out for this project only.",
        block: {
          kind: "terminal",
          label: "claude",
          code: `claude mcp add --transport http --scope user thewebroom ${MCP_URL} \\\n  --header "Authorization: Bearer $THEWEBROOM_TOKEN"`,
        },
      },
      {
        text: "Check it's connected:",
        block: { kind: "terminal", label: "claude", code: "claude mcp list" },
      },
    ],
    check: "The list shows “thewebroom … ✓ Connected”. In a session, /mcp lists its 9 tools.",
  },
  {
    id: "cursor",
    name: "Cursor",
    intro: "Add the server to Cursor's MCP file: in your home folder for every project, or in .cursor/ for one.",
    steps: [
      {
        text: "Create or open ~/.cursor/mcp.json and add:",
        block: {
          kind: "file",
          filename: "~/.cursor/mcp.json",
          lang: "json",
          code: json({ mcpServers: { thewebroom: { url: MCP_URL, headers: { Authorization: `Bearer ${TOKEN}` } } } }),
        },
      },
      { text: "Save, then open Cursor Settings → MCP and turn thewebroom on if it's off." },
    ],
    check: "thewebroom shows a green dot and 9 tools. Ask in Agent mode.",
  },
  {
    id: "vscode",
    name: "VS Code",
    intro: "GitHub Copilot's agent mode reads .vscode/mcp.json. VS Code asks for the token once and keeps it in its secret storage.",
    steps: [
      {
        text: "Create .vscode/mcp.json in your project:",
        block: {
          kind: "file",
          filename: ".vscode/mcp.json",
          lang: "json",
          code: json({
            inputs: [{ type: "promptString", id: "thewebroom-token", description: "The Web Room token", password: true }],
            servers: {
              thewebroom: { type: "http", url: MCP_URL, headers: { Authorization: "Bearer ${input:thewebroom-token}" } },
            },
          }),
        },
      },
      { text: "Click Start above the server in the file and paste your token when asked." },
    ],
    check: "In Chat, switch to Agent mode and open the tools menu: thewebroom lists 9 tools.",
  },
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    intro: "Claude Desktop runs the server through mcp-remote, which sends your token as a header. It needs Node.js 18 or newer.",
    steps: [
      {
        text: "Open Settings → Developer → Edit Config. The file is ~/Library/Application Support/Claude/claude_desktop_config.json on macOS and %APPDATA%\\Claude\\claude_desktop_config.json on Windows. Add:",
        block: {
          kind: "file",
          filename: "claude_desktop_config.json",
          lang: "json",
          code: json({
            mcpServers: {
              thewebroom: {
                command: "npx",
                args: ["-y", "mcp-remote", MCP_URL, "--header", "Authorization:${AUTH_HEADER}"],
                env: { AUTH_HEADER: `Bearer ${TOKEN}` },
              },
            },
          }),
        },
      },
      { text: "Quit Claude Desktop completely and open it again." },
    ],
    check: "The tools icon under the message box lists thewebroom.",
  },
  {
    id: "other",
    name: "Other clients",
    intro: "Any client that speaks MCP over Streamable HTTP works: the endpoint, plus one header.",
    steps: [
      {
        text: `URL ${MCP_URL}, header Authorization: Bearer <token>. Test it from a terminal:`,
        block: {
          kind: "terminal",
          label: "curl",
          code: `curl -s ${MCP_URL} \\\n  -H "Authorization: Bearer $THEWEBROOM_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -H "Accept: application/json, text/event-stream" \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`,
        },
      },
    ],
    check: "The answer lists the 9 tools. A 401 means the token is wrong, revoked or expired.",
  },
];

export type McpExample = { prompt: string; tools: string[]; result: string };

export const MCP_EXAMPLES: McpExample[] = [
  {
    prompt: "Read the rules on The Web Room, then turn NOTES.md into a draft about how we cut our build time in half.",
    tools: ["get_rules", "list_topics", "create_draft"],
    result: "A draft in My posts, marked AI-assisted, with a link to open it in the editor.",
  },
  {
    prompt: "Write a draft about the bug we fixed on this branch. Use the diff, keep the code short, and say why it happened.",
    tools: ["get_rules", "create_draft"],
    result: "A draft built from your code, in your account; nothing is published.",
  },
  {
    prompt: "Search The Web Room for posts about caching in server components and tell me whether my draft adds something new.",
    tools: ["search_posts", "read_post", "list_drafts", "read_draft"],
    result: "An answer in your agent, with links to the posts it read.",
  },
  {
    prompt: "Open my draft “Streaming forms with server actions”, tighten the intro and add a table comparing the two approaches.",
    tools: ["list_drafts", "read_draft", "update_draft"],
    result: "The same draft, changed. Open it in the editor to review before publishing.",
  },
  {
    prompt: "Move my latest draft to the Performance topic and give it a subtitle under 80 characters.",
    tools: ["list_drafts", "update_draft"],
    result: "Topic and subtitle changed; the body is untouched.",
  },
];

export const MCP_EXAMPLE = `create_draft({
  title: "Streaming forms with server actions",
  subtitle: "What changed when we stopped waiting for the whole response",
  topic: "Web Architecture",
  markdown: "## The problem\\n\\nOur checkout form waited for..."
})

→ Draft saved (id k57…). Review and publish it at ${SITE_URL}/edit/streaming-forms-with-server-actions.`;

// What happens on the site once an agent has written a draft.
export const MCP_IN_EDITOR = [
  { title: "My posts", text: "The draft is there, marked AI-assisted, with its topic and reading time." },
  { title: "The editor", text: "Open it to read every line. Add a cover image: agents can't upload one." },
  { title: "Agent in the editor", text: "Ask the editor's own agent to proofread, rewrite or shorten a part, or add a table or a code block." },
  { title: "Publish", text: "Publish now or schedule it. Only you can; agents never publish." },
];

export const MCP_TROUBLESHOOTING = [
  { problem: "401 Unauthorized", fix: "The token is wrong, revoked or expired. Check the header reads “Authorization: Bearer twr_…”, or create a new token." },
  { problem: "429 Too many requests", fix: `More than ${L.requestsPerHour} requests in an hour. Wait, or ask the agent to do fewer steps.` },
  { problem: "No tools in the client", fix: "Restart the client after editing its config, and check the URL ends with /api/mcp." },
  { problem: "Draft too short to publish", fix: `Publishing needs ${L.bodyMin.toLocaleString("en")} characters. Ask the agent to expand it, or finish it in the editor.` },
];

export function rulesMarkdown() {
  const sections = RULES.map(
    (section) =>
      `## ${section.title}\n\n${section.intro ? `${section.intro}\n\n` : ""}${section.rules.map((rule) => `- ${rule}`).join("\n")}`
  ).join("\n\n");
  return `# Rules\n\nThe rules members and their agents follow on The Web Room (${SITE_URL}/rules).\n\n${sections}\n`;
}

function guideBlockMarkdown(block: GuideBlock) {
  return block.kind === "terminal"
    ? `\`\`\`bash\n${block.code}\n\`\`\``
    : `\`${block.filename}\`\n\n\`\`\`${block.lang}\n${block.code}\n\`\`\``;
}

export function mcpMarkdown() {
  const clients = MCP_CLIENTS.map(
    (client) =>
      `### ${client.name}\n\n${client.intro}\n\n${client.steps
        .map((step, i) => `${i + 1}. ${step.text}${step.block ? `\n\n${guideBlockMarkdown(step.block)}` : ""}`)
        .join("\n\n")}\n\nCheck: ${client.check}`
  ).join("\n\n");

  return `# The Web Room MCP server

Connect your own agent (Claude Code, Cursor, VS Code, Claude Desktop, any MCP client) to write drafts for your account. A person always publishes.

- Endpoint: ${MCP_URL} (Streamable HTTP, JSON responses)
- Auth: \`Authorization: Bearer <token>\`. Create a token at ${SITE_URL}/mcp while signed in; it's shown once.
- Topics: ${TOPICS.join(", ")}

## Connect

${clients}

## Tools

${MCP_TOOLS.map((tool) => `- \`${tool.name}\`: ${tool.text}`).join("\n")}

## Examples

${MCP_EXAMPLES.map((example) => `- “${example.prompt}” → ${example.tools.join(", ")}. ${example.result}`).join("\n")}

\`\`\`ts
${MCP_EXAMPLE}
\`\`\`

## After a draft

${MCP_IN_EDITOR.map((item) => `- ${item.title}: ${item.text}`).join("\n")}

## Limits

${MCP_LIMITS.map((limit) => `- ${limit.label}: ${limit.value}`).join("\n")}

## Formatting

${MCP_FORMATTING.map((item) => `- ${item.name}: ${item.detail}`).join("\n")}

## Troubleshooting

${MCP_TROUBLESHOOTING.map((item) => `- ${item.problem}: ${item.fix}`).join("\n")}

${rulesMarkdown().replace(/^# Rules/, "## Rules").replace(/^## (?!Rules)/gm, "### ")}`;
}
