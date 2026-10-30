import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { components } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { assertUserNotBanned, authComponent } from "./auth";
import { topicValidator } from "./topics";
import { AGENT_LIMITS } from "./agentLimits";

// Agents connect through the MCP server (/api/mcp) with a token a member creates on /mcp.
// An agent acts as that member but can only read published posts and write the member's
// own drafts: it can never publish, schedule, delete, comment or follow.

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

type MemberContact = { _id: string; email?: string | null; name?: string | null };

async function getMember(ctx: QueryCtx | MutationCtx, userId: string) {
  return (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "user",
    where: [{ field: "_id", operator: "eq", value: userId }],
  })) as MemberContact | null;
}

// The token's row and its member, or an error the agent can show its user.
async function requireToken(ctx: QueryCtx | MutationCtx, token: string) {
  const tokenHash = await sha256Hex(token.trim());
  const row = await ctx.db
    .query("agentTokens")
    .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
    .first();
  if (!row || row.revokedAt !== undefined) throw new ConvexError("This token is not valid. Create one on /mcp.");
  if (row.expiresAt <= Date.now()) throw new ConvexError("This token has expired. Create a new one on /mcp.");

  const member = await getMember(ctx, row.userId);
  if (!member?.email) throw new ConvexError("The account for this token no longer exists.");
  await assertUserNotBanned(ctx, { _id: member._id, email: member.email });
  return { row, member };
}

// Counts one action in a daily window on the member's rateLimits row.
async function countDaily(
  ctx: MutationCtx,
  userId: string,
  kind: "agentDraft" | "agentUpdate",
  limit: number,
  message: string
) {
  const now = Date.now();
  const startKey = `${kind}WindowStart` as const;
  const countKey = `${kind}Count` as const;
  const record = await ctx.db
    .query("rateLimits")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();
  const start = record?.[startKey];
  const open = start !== undefined && now - start < DAY_MS;
  const count = (open ? (record?.[countKey] ?? 0) : 0) + 1;
  if (count > limit) throw new ConvexError(message);
  const update = { [startKey]: open ? start : now, [countKey]: count };
  if (record) await ctx.db.patch(record._id, update);
  else await ctx.db.insert("rateLimits", { userId, ...update });
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlug(ctx: MutationCtx, title: string, excludeId?: Id<"posts">) {
  const base = slugify(title) || "draft";
  for (let counter = 0; ; counter++) {
    const slug = counter === 0 ? base : `${base}-${counter}`;
    const existing = await ctx.db
      .query("posts")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!existing || existing._id === excludeId) return slug;
  }
}

function checkFields(fields: { title?: string; subtitle?: string; body?: string }) {
  const L = AGENT_LIMITS;
  if (fields.title !== undefined) {
    const title = fields.title.trim();
    if (title.length < L.titleMin || title.length > L.titleMax)
      throw new ConvexError(`The title must be ${L.titleMin}–${L.titleMax} characters.`);
    if (!/^[a-zA-Z0-9\s-]+$/.test(title))
      throw new ConvexError("The title may use letters, numbers, spaces and hyphens only.");
  }
  if (fields.subtitle !== undefined) {
    const subtitle = fields.subtitle.trim();
    if (subtitle.length < L.subtitleMin || subtitle.length > L.subtitleMax)
      throw new ConvexError(`The subtitle must be ${L.subtitleMin}–${L.subtitleMax} characters.`);
  }
  if (fields.body !== undefined && fields.body.length > L.bodyMax) {
    throw new ConvexError(`The body must be under ${L.bodyMax} characters.`);
  }
}

function minRead(text: string) {
  return Math.min(30, Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 220)));
}

function draftSummary(post: Doc<"posts">) {
  return {
    id: post._id,
    title: post.title,
    subtitle: post.subtitle,
    topic: post.topic,
    status: post.status ?? "published",
    slug: post.slug ?? null,
    updatedAt: post._creationTime,
    characters: post.body.length,
  };
}

// ---- Tokens, managed by the signed-in member on /mcp ----

export const myTokens = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx).catch(() => null);
    if (!user) return [];
    const rows = await ctx.db
      .query("agentTokens")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
    return rows
      .filter((row) => row.revokedAt === undefined)
      .map((row) => ({
        id: row._id,
        name: row.name,
        prefix: row.prefix,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
        lastUsedAt: row.lastUsedAt ?? null,
        expired: row.expiresAt <= Date.now(),
      }));
  },
});

// The token is made on the server (app/mcp/actions.ts) with a strong random source; this
// stores its hash. A member who calls this directly can only make a token for themselves.
export const createToken = mutation({
  args: { name: v.string(), token: v.string() },
  handler: async (ctx, { name, token }) => {
    const user = await authComponent.getAuthUser(ctx);
    await assertUserNotBanned(ctx, user);
    if (!user.emailVerified) throw new ConvexError("Verify your e-mail address before creating a token.");

    const trimmedName = name.trim().slice(0, 40) || "My agent";
    if (!/^twr_[A-Za-z0-9_-]{40,}$/.test(token)) throw new ConvexError("Invalid token");

    const now = Date.now();
    const active = (
      await ctx.db
        .query("agentTokens")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect()
    ).filter((row) => row.revokedAt === undefined && row.expiresAt > now);
    if (active.length >= AGENT_LIMITS.tokensPerAccount) {
      throw new ConvexError(`You can have ${AGENT_LIMITS.tokensPerAccount} tokens. Revoke one first.`);
    }

    await ctx.db.insert("agentTokens", {
      userId: user._id,
      name: trimmedName,
      tokenHash: await sha256Hex(token),
      prefix: token.slice(0, 10),
      createdAt: now,
      expiresAt: now + AGENT_LIMITS.tokenLifetimeDays * DAY_MS,
    });
  },
});

export const revokeToken = mutation({
  args: { id: v.id("agentTokens") },
  handler: async (ctx, { id }) => {
    const user = await authComponent.getAuthUser(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== user._id) throw new ConvexError("Token not found");
    if (row.revokedAt === undefined) await ctx.db.patch(id, { revokedAt: Date.now() });
  },
});

// ---- Called by the MCP server with the agent's token ----

// Every MCP request starts here: checks the token, counts the request, and says who it is.
export const authenticate = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { row, member } = await requireToken(ctx, token);
    const now = Date.now();
    const open = row.requestWindowStart !== undefined && now - row.requestWindowStart < HOUR_MS;
    const count = (open ? (row.requestCount ?? 0) : 0) + 1;
    if (count > AGENT_LIMITS.requestsPerHour) {
      throw new ConvexError(`Too many requests: ${AGENT_LIMITS.requestsPerHour} an hour per token.`);
    }
    await ctx.db.patch(row._id, {
      lastUsedAt: now,
      requestWindowStart: open ? row.requestWindowStart : now,
      requestCount: count,
    });
    return { name: member.name?.trim() || "Member", tokenName: row.name, expiresAt: row.expiresAt };
  },
});

export const listDrafts = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const { row } = await requireToken(ctx, token);
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_authorId", (q) => q.eq("authorId", row.userId))
      .order("desc")
      .collect();
    return posts.filter((post) => post.status === "draft").map(draftSummary);
  },
});

export const getDraft = query({
  args: { token: v.string(), id: v.string() },
  handler: async (ctx, { token, id }) => {
    const { row } = await requireToken(ctx, token);
    const postId = ctx.db.normalizeId("posts", id);
    const post = postId ? await ctx.db.get(postId) : null;
    if (!post || post.authorId !== row.userId || post.status !== "draft") {
      throw new ConvexError("No draft of yours has this id.");
    }
    return { ...draftSummary(post), contentHtml: post.contentHtml ?? "", body: post.body };
  },
});

const draftFields = {
  title: v.string(),
  subtitle: v.string(),
  topic: topicValidator,
  // Plain text of the body (used for length and reading time) and its sanitized HTML.
  body: v.string(),
  contentHtml: v.string(),
};

export const createDraft = mutation({
  args: { token: v.string(), ...draftFields },
  handler: async (ctx, { token, ...fields }) => {
    const { row, member } = await requireToken(ctx, token);
    checkFields(fields);
    await countDaily(
      ctx,
      row.userId,
      "agentDraft",
      AGENT_LIMITS.draftsPerDay,
      `Agents can write ${AGENT_LIMITS.draftsPerDay} new drafts a day per account.`
    );

    const title = fields.title.trim();
    const slug = await uniqueSlug(ctx, title);
    const id = await ctx.db.insert("posts", {
      title,
      subtitle: fields.subtitle.trim(),
      topic: fields.topic,
      body: fields.body,
      contentHtml: fields.contentHtml,
      minRead: minRead(fields.body),
      slug,
      authorId: row.userId,
      authorName: member.name?.trim() || "",
      status: "draft",
      aiAssisted: true,
    });
    return { id, slug };
  },
});

export const updateDraft = mutation({
  args: {
    token: v.string(),
    id: v.string(),
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    topic: v.optional(topicValidator),
    body: v.optional(v.string()),
    contentHtml: v.optional(v.string()),
  },
  handler: async (ctx, { token, id, ...fields }) => {
    const { row } = await requireToken(ctx, token);
    const postId = ctx.db.normalizeId("posts", id);
    const post = postId ? await ctx.db.get(postId) : null;
    // Only drafts: a published or scheduled post changes only in the editor.
    if (!post || post.authorId !== row.userId || post.status !== "draft") {
      throw new ConvexError("No draft of yours has this id. Agents can change drafts only.");
    }
    checkFields(fields);
    await countDaily(
      ctx,
      row.userId,
      "agentUpdate",
      AGENT_LIMITS.draftUpdatesPerDay,
      `Agents can change drafts ${AGENT_LIMITS.draftUpdatesPerDay} times a day per account.`
    );

    const patch: Partial<Doc<"posts">> = { aiAssisted: true };
    if (fields.title !== undefined) {
      patch.title = fields.title.trim();
      patch.slug = await uniqueSlug(ctx, patch.title, post._id);
    }
    if (fields.subtitle !== undefined) patch.subtitle = fields.subtitle.trim();
    if (fields.topic !== undefined) patch.topic = fields.topic;
    if (fields.body !== undefined && fields.contentHtml !== undefined) {
      patch.body = fields.body;
      patch.contentHtml = fields.contentHtml;
      patch.minRead = minRead(fields.body);
    }
    await ctx.db.patch(post._id, patch);
    return { id: post._id, slug: patch.slug ?? post.slug ?? null };
  },
});
