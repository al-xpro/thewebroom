import { fetchMutation, fetchQuery } from "convex/nextjs";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import { AGENT_LIMITS } from "@/convex/agentLimits";
import { TOPICS, isTopic } from "@/convex/topics";
import { MCP_TOOLS, mcpMarkdown } from "@/lib/agent-docs";
import { SITE_URL, htmlToMarkdown, markdownToPostHtml, postToMarkdown } from "@/lib/post-markdown";
import { escapeHtml, htmlToText, sanitizePostHtml } from "@/lib/sanitize-server";

// The MCP server (Streamable HTTP, stateless, JSON responses). Each request carries a
// member's token: `Authorization: Bearer twr_…`. Agents read published posts and write
// the member's drafts; publishing always happens in the editor.

const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const SERVER_INFO = { name: "thewebroom", title: "The Web Room", version: "1.0.0" };
const INSTRUCTIONS = `The Web Room is a community for writing about ${TOPICS.join(", ")}. You write drafts for the member who owns the token; they read and publish them on ${SITE_URL}. Call get_rules before writing, never invent facts or links, and keep to one idea per post.`;

type JsonRpcRequest = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };
type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean; structuredContent?: unknown };

const topicSchema = { type: "string", enum: [...TOPICS], description: "The post's topic." };

const TOOL_SCHEMAS: Record<(typeof MCP_TOOLS)[number]["name"], { inputSchema: object; readOnly: boolean }> = {
  get_rules: { inputSchema: { type: "object", properties: {} }, readOnly: true },
  whoami: { inputSchema: { type: "object", properties: {} }, readOnly: true },
  list_topics: { inputSchema: { type: "object", properties: {} }, readOnly: true },
  search_posts: {
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Words to look for in titles and subtitles. Empty for the newest posts." },
        topic: topicSchema,
        limit: { type: "integer", minimum: 1, maximum: 25, default: 10 },
      },
    },
    readOnly: true,
  },
  read_post: {
    inputSchema: {
      type: "object",
      properties: { slug: { type: "string", description: "The post's slug, from search_posts." } },
      required: ["slug"],
    },
    readOnly: true,
  },
  list_drafts: { inputSchema: { type: "object", properties: {} }, readOnly: true },
  read_draft: {
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "The draft's id, from list_drafts." } },
      required: ["id"],
    },
    readOnly: true,
  },
  create_draft: {
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          minLength: AGENT_LIMITS.titleMin,
          maxLength: AGENT_LIMITS.titleMax,
          description: "Letters, numbers, spaces and hyphens only.",
        },
        subtitle: { type: "string", minLength: AGENT_LIMITS.subtitleMin, maxLength: AGENT_LIMITS.subtitleMax },
        topic: topicSchema,
        markdown: {
          type: "string",
          maxLength: AGENT_LIMITS.bodyMax,
          description: `The body in Markdown, without the title. ${AGENT_LIMITS.bodyMin}+ characters to publish.`,
        },
      },
      required: ["title", "subtitle", "topic", "markdown"],
    },
    readOnly: false,
  },
  update_draft: {
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string", minLength: AGENT_LIMITS.titleMin, maxLength: AGENT_LIMITS.titleMax },
        subtitle: { type: "string", minLength: AGENT_LIMITS.subtitleMin, maxLength: AGENT_LIMITS.subtitleMax },
        topic: topicSchema,
        markdown: { type: "string", maxLength: AGENT_LIMITS.bodyMax, description: "Replaces the whole body." },
      },
      required: ["id"],
    },
    readOnly: false,
  },
};

const text = (value: string, structuredContent?: unknown): ToolResult => ({
  content: [{ type: "text", text: value }],
  ...(structuredContent === undefined ? {} : { structuredContent }),
});
const toolError = (message: string): ToolResult => ({ content: [{ type: "text", text: message }], isError: true });

function str(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function editorUrl(slug: string | null | undefined) {
  return slug ? `${SITE_URL}/edit/${slug}` : `${SITE_URL}/my-posts`;
}

function bodyFromMarkdown(markdown: string) {
  const contentHtml = markdownToPostHtml(markdown);
  const body = htmlToText(contentHtml);
  return { contentHtml, body };
}

async function callTool(token: string, member: { name: string }, name: string, args: Record<string, unknown>) {
  switch (name) {
    case "get_rules":
      return text(mcpMarkdown());

    case "whoami":
      return text(
        `You write for ${member.name} on The Web Room. Drafts only: ${member.name} publishes them at ${SITE_URL}/my-posts.`,
        { name: member.name, limits: AGENT_LIMITS }
      );

    case "list_topics":
      return text(TOPICS.join("\n"), { topics: TOPICS });

    case "search_posts": {
      const query = (str(args.query) ?? "").trim().toLowerCase();
      const topic = str(args.topic);
      const limit = Math.min(25, Math.max(1, Number(args.limit) || 10));
      const words = query.split(/\s+/).filter(Boolean);
      const posts = (await fetchQuery(api.posts.getPublishedPosts, { limit: 200, ...(isTopic(topic) ? { topics: [topic] } : {}) }))
        .filter((post) => post.slug && (!topic || post.topic === topic))
        .filter((post) => {
          const haystack = `${post.title} ${post.subtitle} ${post.authorName}`.toLowerCase();
          return words.every((word) => haystack.includes(word));
        })
        .slice(0, limit)
        .map((post) => ({
          slug: post.slug!,
          title: post.title,
          subtitle: post.subtitle,
          topic: post.topic,
          author: post.authorName,
          date: new Date(post.publishAt ?? post._creationTime).toISOString().slice(0, 10),
          url: `${SITE_URL}/posts/${post.slug}`,
        }));
      if (posts.length === 0) return text("No published posts match.", { posts });
      return text(
        posts.map((post) => `- ${post.title} (${post.slug}) by ${post.author}, ${post.date}: ${post.subtitle}`).join("\n"),
        { posts }
      );
    }

    case "read_post": {
      const slug = str(args.slug);
      if (!slug) return toolError("slug is required.");
      const post = await fetchQuery(api.posts.getPostBySlug, { slug });
      if (!post || (post.status !== undefined && post.status !== "published")) {
        return toolError("No published post has this slug.");
      }
      return text(postToMarkdown(post));
    }

    case "list_drafts": {
      const drafts = await fetchQuery(api.agents.listDrafts, { token });
      if (drafts.length === 0) return text("No drafts yet.", { drafts });
      return text(
        drafts.map((draft) => `- ${draft.title} (id ${draft.id}), ${draft.topic}, ${draft.characters} characters`).join("\n"),
        { drafts }
      );
    }

    case "read_draft": {
      const id = str(args.id);
      if (!id) return toolError("id is required.");
      const draft = await fetchQuery(api.agents.getDraft, { token, id });
      const markdown = htmlToMarkdown(sanitizePostHtml(draft.contentHtml || `<p>${escapeHtml(draft.body)}</p>`));
      return text(
        `---\nid: ${draft.id}\ntitle: ${JSON.stringify(draft.title)}\nsubtitle: ${JSON.stringify(draft.subtitle)}\ntopic: ${JSON.stringify(draft.topic)}\n---\n\n${markdown}\n`
      );
    }

    case "create_draft": {
      const title = str(args.title);
      const subtitle = str(args.subtitle);
      const topic = args.topic;
      const markdown = str(args.markdown);
      if (!title || !subtitle || !markdown || !isTopic(topic)) {
        return toolError(`title, subtitle, markdown and topic (${TOPICS.join(", ")}) are required.`);
      }
      const { contentHtml, body } = bodyFromMarkdown(markdown);
      const { id, slug } = await fetchMutation(api.agents.createDraft, { token, title, subtitle, topic, body, contentHtml });
      const short = body.length < AGENT_LIMITS.bodyMin;
      return text(
        `Draft saved (id ${id}). ${member.name} can review and publish it at ${editorUrl(slug)}.${
          short ? ` The body has ${body.length} characters; it needs ${AGENT_LIMITS.bodyMin} to publish.` : ""
        } A cover image is added in the editor.`,
        { id, slug, editUrl: editorUrl(slug), characters: body.length }
      );
    }

    case "update_draft": {
      const id = str(args.id);
      if (!id) return toolError("id is required.");
      if (args.topic !== undefined && !isTopic(args.topic)) return toolError(`topic must be one of ${TOPICS.join(", ")}.`);
      const markdown = str(args.markdown);
      const content = markdown !== undefined ? bodyFromMarkdown(markdown) : {};
      const { slug } = await fetchMutation(api.agents.updateDraft, {
        token,
        id,
        title: str(args.title),
        subtitle: str(args.subtitle),
        topic: isTopic(args.topic) ? args.topic : undefined,
        ...content,
      });
      return text(`Draft updated. Review it at ${editorUrl(slug)}.`, { id, slug, editUrl: editorUrl(slug) });
    }

    default:
      return null;
  }
}

function errorMessage(error: unknown) {
  if (error instanceof ConvexError) return typeof error.data === "string" ? error.data : "Request refused";
  return "Something went wrong. Try again.";
}

function rpcResult(id: JsonRpcRequest["id"], result: unknown) {
  return { jsonrpc: "2.0", id: id ?? null, result };
}

function rpcError(id: JsonRpcRequest["id"], code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

const UNAUTHORIZED_HEADERS = {
  "WWW-Authenticate": `Bearer realm="thewebroom", error="invalid_token", error_description="Create a token at ${SITE_URL}/mcp"`,
};

export async function POST(request: Request) {
  let message: JsonRpcRequest;
  try {
    message = await request.json();
  } catch {
    return json(rpcError(null, -32700, "Parse error"), 400);
  }
  if (!message || typeof message !== "object" || Array.isArray(message) || typeof message.method !== "string") {
    return json(rpcError(null, -32600, "Invalid request: send one JSON-RPC message"), 400);
  }

  // Notifications (no id) need no answer.
  if (message.id === undefined || message.method.startsWith("notifications/")) {
    return new Response(null, { status: 202 });
  }

  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) {
    return json(rpcError(message.id, -32001, `Missing token. Create one at ${SITE_URL}/mcp.`), 401, UNAUTHORIZED_HEADERS);
  }

  let member: { name: string };
  try {
    member = await fetchMutation(api.agents.authenticate, { token });
  } catch (error) {
    const reason = errorMessage(error);
    const limited = reason.startsWith("Too many");
    return json(rpcError(message.id, -32001, reason), limited ? 429 : 401, limited ? {} : UNAUTHORIZED_HEADERS);
  }

  switch (message.method) {
    case "initialize": {
      const requested = str(message.params?.protocolVersion);
      const protocolVersion = requested && PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0];
      return json(
        rpcResult(message.id, {
          protocolVersion,
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
          instructions: INSTRUCTIONS,
        })
      );
    }

    case "ping":
      return json(rpcResult(message.id, {}));

    case "tools/list":
      return json(
        rpcResult(message.id, {
          tools: MCP_TOOLS.map((tool) => ({
            name: tool.name,
            description: tool.text,
            inputSchema: TOOL_SCHEMAS[tool.name].inputSchema,
            annotations: {
              readOnlyHint: TOOL_SCHEMAS[tool.name].readOnly,
              destructiveHint: false,
              openWorldHint: false,
            },
          })),
        })
      );

    case "tools/call": {
      const name = str(message.params?.name);
      const args = (message.params?.arguments ?? {}) as Record<string, unknown>;
      if (!name) return json(rpcError(message.id, -32602, "Missing tool name"));
      try {
        const result = await callTool(token, member, name, args);
        if (!result) return json(rpcError(message.id, -32602, `Unknown tool: ${name}`));
        return json(rpcResult(message.id, result));
      } catch (error) {
        return json(rpcResult(message.id, toolError(errorMessage(error))));
      }
    }

    // Resources and prompts aren't offered; empty lists keep clients that ask happy.
    case "resources/list":
      return json(rpcResult(message.id, { resources: [] }));
    case "prompts/list":
      return json(rpcResult(message.id, { prompts: [] }));

    default:
      return json(rpcError(message.id, -32601, `Method not found: ${message.method}`));
  }
}

// No server-sent stream: every answer comes back on the POST.
export function GET() {
  return new Response("Method Not Allowed. POST JSON-RPC messages to this endpoint; see /mcp.\n", {
    status: 405,
    headers: { Allow: "POST", "Content-Type": "text/plain" },
  });
}

export function DELETE() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
