import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { assertUserNotBanned, authComponent } from "./auth";
import { notify } from "./notifications";

// What readers expect: a reading list (bookmarks), one reaction ("helpful", with no
// public count to race for: readers see only their own, the author sees the total), and
// series of posts by one author.

const SERIES_TITLE_MAX = 60;
const SERIES_PER_AUTHOR = 20;
const SERIES_PARTS_MAX = 20;

function isPublished(post: Doc<"posts">) {
  return post.status === undefined || post.status === "published";
}

async function viewer(ctx: QueryCtx) {
  return await authComponent.safeGetAuthUser(ctx).catch(() => null);
}

async function requireMember(ctx: MutationCtx) {
  const user = await authComponent.getAuthUser(ctx);
  await assertUserNotBanned(ctx, user);
  return user;
}

async function requirePublished(ctx: MutationCtx, postId: Id<"posts">) {
  const post = await ctx.db.get(postId);
  if (!post || !isPublished(post)) throw new ConvexError("This post isn't published.");
  return post;
}

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "series"
  );
}

// ---- Reading list ----

export const isBookmarked = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const user = await viewer(ctx);
    if (!user) return false;
    const row = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_post", (q) => q.eq("userId", user._id).eq("postId", postId))
      .first();
    return Boolean(row);
  },
});

export const toggleBookmark = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const user = await requireMember(ctx);
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_post", (q) => q.eq("userId", user._id).eq("postId", postId))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    }
    await requirePublished(ctx, postId);
    await ctx.db.insert("bookmarks", { userId: user._id, postId, createdAt: Date.now() });
    return true;
  },
});

// The signed-in member's reading list, newest saved first. Posts that were unpublished
// since are left out.
export const myReadingList = query({
  args: {},
  handler: async (ctx) => {
    const user = await viewer(ctx);
    if (!user) return null;
    const rows = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(200);
    const items = [];
    for (const row of rows) {
      const post = await ctx.db.get(row.postId);
      if (!post || !isPublished(post) || !post.slug) continue;
      items.push({
        postId: post._id,
        slug: post.slug,
        title: post.title,
        subtitle: post.subtitle,
        topic: post.topic,
        minRead: post.minRead ?? 1,
        authorId: post.authorId,
        authorName: post.authorName,
        savedAt: row.createdAt,
      });
    }
    return items;
  },
});

// ---- Helpful ----

// The viewer's own reaction, and the total only for the post's author.
export const helpful = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const user = await viewer(ctx);
    const post = await ctx.db.get(postId);
    if (!post) return { mine: false, isAuthor: false, count: null };
    const mine = user
      ? Boolean(
          await ctx.db
            .query("reactions")
            .withIndex("by_user_post", (q) => q.eq("userId", user._id).eq("postId", postId))
            .first()
        )
      : false;
    const isAuthor = user?._id === post.authorId;
    const count = isAuthor
      ? (await ctx.db.query("reactions").withIndex("by_post", (q) => q.eq("postId", postId)).collect()).length
      : null;
    return { mine, isAuthor, count };
  },
});

export const toggleHelpful = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const user = await requireMember(ctx);
    const post = await requirePublished(ctx, postId);
    if (post.authorId === user._id) throw new ConvexError("You can't mark your own post as helpful.");
    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_user_post", (q) => q.eq("userId", user._id).eq("postId", postId))
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    }
    await ctx.db.insert("reactions", { userId: user._id, postId, kind: "helpful", createdAt: Date.now() });
    await notify(ctx, {
      userId: post.authorId,
      kind: "helpful",
      actorId: user._id,
      actorName: user.name || "",
      postId,
      postSlug: post.slug,
      postTitle: post.title,
    });
    return true;
  },
});

// ---- Series ----

async function publishedParts(ctx: QueryCtx, seriesId: Id<"series">) {
  const posts = await ctx.db
    .query("posts")
    .withIndex("by_series", (q) => q.eq("seriesId", seriesId))
    .collect();
  return posts.filter((post) => isPublished(post) && post.slug);
}

// The series a published post belongs to, with its published parts in order.
export const seriesForPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get(postId);
    if (!post?.seriesId) return null;
    const series = await ctx.db.get(post.seriesId);
    if (!series) return null;
    const parts = await publishedParts(ctx, series._id);
    if (parts.length < 2) return null;
    return {
      id: series._id,
      title: series.title,
      slug: series.slug,
      current: post._id,
      parts: parts.map((part, index) => ({ id: part._id, slug: part.slug!, title: part.title, number: index + 1 })),
    };
  },
});

export const seriesBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const series = await ctx.db
      .query("series")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!series) return null;
    const parts = await publishedParts(ctx, series._id);
    if (parts.length === 0) return null;
    return {
      title: series.title,
      authorId: series.authorId,
      authorName: parts[0].authorName,
      parts: parts.map((part, index) => ({
        id: part._id,
        slug: part.slug!,
        title: part.title,
        subtitle: part.subtitle,
        topic: part.topic,
        minRead: part.minRead ?? 1,
        number: index + 1,
      })),
    };
  },
});

// The author's series with every part (drafts too), for My posts.
export const mySeries = query({
  args: {},
  handler: async (ctx) => {
    const user = await viewer(ctx);
    if (!user) return [];
    const all = await ctx.db
      .query("series")
      .withIndex("by_author", (q) => q.eq("authorId", user._id))
      .collect();
    const result = [];
    for (const series of all.sort((a, b) => b.createdAt - a.createdAt)) {
      const parts = await ctx.db
        .query("posts")
        .withIndex("by_series", (q) => q.eq("seriesId", series._id))
        .collect();
      result.push({
        id: series._id,
        title: series.title,
        slug: series.slug,
        parts: parts.map((part) => ({ id: part._id, title: part.title, status: part.status ?? "published", part: part.seriesPart ?? 0 })),
      });
    }
    return result;
  },
});

async function ownPost(ctx: MutationCtx, userId: string, postId: Id<"posts">) {
  const post = await ctx.db.get(postId);
  if (!post || post.authorId !== userId) throw new ConvexError("Post not found");
  return post;
}

async function renumber(ctx: MutationCtx, seriesId: Id<"series">) {
  const parts = await ctx.db
    .query("posts")
    .withIndex("by_series", (q) => q.eq("seriesId", seriesId))
    .collect();
  for (const [index, part] of parts.entries()) {
    if (part.seriesPart !== index + 1) await ctx.db.patch(part._id, { seriesPart: index + 1 });
  }
  return parts.length;
}

// Adds a post at the end of a series: an existing one (seriesId) or a new one (title).
export const addToSeries = mutation({
  args: { postId: v.id("posts"), seriesId: v.optional(v.id("series")), title: v.optional(v.string()) },
  handler: async (ctx, { postId, seriesId, title }) => {
    const user = await requireMember(ctx);
    const post = await ownPost(ctx, user._id, postId);

    let target: Id<"series">;
    if (seriesId) {
      const series = await ctx.db.get(seriesId);
      if (!series || series.authorId !== user._id) throw new ConvexError("Series not found");
      target = series._id;
    } else {
      const name = (title ?? "").trim();
      if (name.length < 3 || name.length > SERIES_TITLE_MAX) {
        throw new ConvexError(`A series title has 3–${SERIES_TITLE_MAX} characters.`);
      }
      const count = (
        await ctx.db
          .query("series")
          .withIndex("by_author", (q) => q.eq("authorId", user._id))
          .collect()
      ).length;
      if (count >= SERIES_PER_AUTHOR) throw new ConvexError(`You can have ${SERIES_PER_AUTHOR} series.`);
      let slug = slugify(name);
      for (let i = 1; await ctx.db.query("series").withIndex("by_slug", (q) => q.eq("slug", slug)).first(); i++) {
        slug = `${slugify(name)}-${i}`;
      }
      target = await ctx.db.insert("series", { authorId: user._id, title: name, slug, createdAt: Date.now() });
    }

    if (post.seriesId === target) return target;
    const previous = post.seriesId;
    const size = (
      await ctx.db
        .query("posts")
        .withIndex("by_series", (q) => q.eq("seriesId", target))
        .collect()
    ).length;
    if (size >= SERIES_PARTS_MAX) throw new ConvexError(`A series has at most ${SERIES_PARTS_MAX} parts.`);
    await ctx.db.patch(post._id, { seriesId: target, seriesPart: size + 1 });
    if (previous) await cleanUp(ctx, previous);
    return target;
  },
});

// Renumbers a series after a part leaves, and removes it when it's empty.
async function cleanUp(ctx: MutationCtx, seriesId: Id<"series">) {
  const left = await renumber(ctx, seriesId);
  if (left === 0) await ctx.db.delete(seriesId);
}

export const removeFromSeries = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const user = await requireMember(ctx);
    const post = await ownPost(ctx, user._id, postId);
    if (!post.seriesId) return;
    const seriesId = post.seriesId;
    await ctx.db.patch(post._id, { seriesId: undefined, seriesPart: undefined });
    await cleanUp(ctx, seriesId);
  },
});

// Swaps a part with the one before or after it.
export const moveInSeries = mutation({
  args: { postId: v.id("posts"), direction: v.union(v.literal("up"), v.literal("down")) },
  handler: async (ctx, { postId, direction }) => {
    const user = await requireMember(ctx);
    const post = await ownPost(ctx, user._id, postId);
    if (!post.seriesId || !post.seriesPart) return;
    const seriesId = post.seriesId;
    const otherPart = post.seriesPart + (direction === "up" ? -1 : 1);
    const other = await ctx.db
      .query("posts")
      .withIndex("by_series", (q) => q.eq("seriesId", seriesId).eq("seriesPart", otherPart))
      .first();
    if (!other) return;
    await ctx.db.patch(other._id, { seriesPart: post.seriesPart });
    await ctx.db.patch(post._id, { seriesPart: otherPart });
  },
});

export const renameSeries = mutation({
  args: { seriesId: v.id("series"), title: v.string() },
  handler: async (ctx, { seriesId, title }) => {
    const user = await requireMember(ctx);
    const series = await ctx.db.get(seriesId);
    if (!series || series.authorId !== user._id) throw new ConvexError("Series not found");
    const name = title.trim();
    if (name.length < 3 || name.length > SERIES_TITLE_MAX) {
      throw new ConvexError(`A series title has 3–${SERIES_TITLE_MAX} characters.`);
    }
    await ctx.db.patch(seriesId, { title: name });
  },
});
