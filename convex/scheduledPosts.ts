import { ConvexError, v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, mutation, type MutationCtx } from "./_generated/server";
import { assertUserNotBanned, authComponent } from "./auth";
import { announcePost, notify } from "./notifications";

// Scheduled posts (#60). A scheduled post is private like a draft until its job publishes
// it. The job checks everything again when it runs, so a post that was moved back to draft,
// hidden by an admin, or whose author was banned in the meantime doesn't go out.

const MIN_LEAD_MS = 60 * 1000;
const MAX_LEAD_MS = 365 * 24 * 60 * 60 * 1000;
const MAX_SERIES = 20;
const INTERVAL_MS = { daily: 24 * 60 * 60 * 1000, weekly: 7 * 24 * 60 * 60 * 1000 } as const;

async function requireAuthor(ctx: MutationCtx) {
  const user = await authComponent.getAuthUser(ctx);
  await assertUserNotBanned(ctx, user);
  return user;
}

async function getOwnSchedulablePost(ctx: MutationCtx, userId: string, postId: Id<"posts">) {
  const post = await ctx.db.get(postId);
  if (!post || post.authorId !== userId) throw new ConvexError("Post not found");
  if (post.status !== "draft" && post.status !== "scheduled") {
    throw new ConvexError("Only drafts and scheduled posts can be scheduled");
  }
  return post;
}

function assertPublishAt(publishAt: number) {
  const lead = publishAt - Date.now();
  if (lead < MIN_LEAD_MS) throw new ConvexError("Pick a time at least a minute from now");
  if (lead > MAX_LEAD_MS) throw new ConvexError("Pick a time within the next year");
}

async function cancelJob(ctx: MutationCtx, post: Doc<"posts">) {
  if (!post.scheduledJobId) return;
  // A job that already ran or was cancelled can't be cancelled again; that's fine.
  await ctx.scheduler.cancel(post.scheduledJobId).catch(() => {});
}

async function schedule(ctx: MutationCtx, post: Doc<"posts">, publishAt: number) {
  await cancelJob(ctx, post);
  const scheduledJobId = await ctx.scheduler.runAt(
    publishAt,
    internal.scheduledPosts.publishScheduledPost,
    { postId: post._id }
  );
  await ctx.db.patch(post._id, { status: "scheduled", publishAt, scheduledJobId });
}

export const schedulePost = mutation({
  args: { postId: v.id("posts"), publishAt: v.number() },
  handler: async (ctx, { postId, publishAt }) => {
    const user = await requireAuthor(ctx);
    const post = await getOwnSchedulablePost(ctx, user._id, postId);
    assertPublishAt(publishAt);
    await schedule(ctx, post, publishAt);
    return { publishAt };
  },
});

// Spreads several drafts over a period: the first at startAt, then one per interval.
export const schedulePostSeries = mutation({
  args: {
    postIds: v.array(v.id("posts")),
    startAt: v.number(),
    interval: v.union(v.literal("daily"), v.literal("weekly")),
  },
  handler: async (ctx, { postIds, startAt, interval }) => {
    const user = await requireAuthor(ctx);
    if (postIds.length === 0) throw new ConvexError("Pick at least one draft");
    if (postIds.length > MAX_SERIES) throw new ConvexError(`Pick at most ${MAX_SERIES} drafts`);
    if (new Set(postIds).size !== postIds.length) throw new ConvexError("A draft is picked twice");

    const times = postIds.map((_, i) => startAt + i * INTERVAL_MS[interval]);
    times.forEach(assertPublishAt);

    const posts = [];
    for (const postId of postIds) posts.push(await getOwnSchedulablePost(ctx, user._id, postId));
    for (const [i, post] of posts.entries()) await schedule(ctx, post, times[i]);
    return posts.map((post, i) => ({ postId: post._id, publishAt: times[i] }));
  },
});

export const unschedulePost = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const user = await requireAuthor(ctx);
    const post = await ctx.db.get(postId);
    if (!post || post.authorId !== user._id) throw new ConvexError("Post not found");
    if (post.status !== "scheduled") return;
    await cancelJob(ctx, post);
    await ctx.db.patch(post._id, { status: "draft", publishAt: undefined, scheduledJobId: undefined });
  },
});

export const publishScheduledPost = internalMutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get(postId);
    if (!post || post.status !== "scheduled") return { published: false };

    const author = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", operator: "eq", value: post.authorId }],
    })) as { _id: string; email: string } | null;

    try {
      if (!author) throw new ConvexError("Author not found");
      await assertUserNotBanned(ctx, author);
    } catch {
      await ctx.db.patch(post._id, { status: "draft", publishAt: undefined, scheduledJobId: undefined });
      return { published: false };
    }

    await ctx.db.patch(post._id, { status: "published", publishAt: Date.now(), scheduledJobId: undefined });
    await notify(ctx, { userId: post.authorId, kind: "published", postId: post._id, postSlug: post.slug, postTitle: post.title });
    await announcePost(ctx, post._id);
    if (post.slug) {
      await ctx.scheduler.runAfter(0, internal.revalidate.revalidateTags, {
        tags: ["blog", `post-${post.slug}`],
      });
    }
    return { published: true };
  },
});
