import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { authComponent, isAdminUserRecord } from "./auth";

// The moderation agent's reviews (called from app/admin/moderation-actions.ts) and the
// admin's decisions. Every review and decision is kept, for the record and the case study.

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await authComponent.safeGetAuthUser(ctx).catch(() => null);
  if (!user || !isAdminUserRecord(user)) throw new ConvexError("Not authorized");
  return user;
}

// What the agent reads: the post's text and a little about its author.
export const postForReview = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    await requireAdmin(ctx);
    const post = await ctx.db.get(postId);
    if (!post) throw new ConvexError("Post not found");
    const byAuthor = await ctx.db
      .query("posts")
      .withIndex("by_authorId", (q) => q.eq("authorId", post.authorId))
      .collect();
    return {
      title: post.title,
      subtitle: post.subtitle,
      topic: post.topic,
      body: post.body,
      aiAssisted: Boolean(post.aiAssisted),
      authorPosts: byAuthor.length,
      authorFirstPostAt: Math.min(...byAuthor.map((p) => p._creationTime)),
    };
  },
});

export const saveReview = mutation({
  args: {
    postId: v.id("posts"),
    verdict: v.union(v.literal("ok"), v.literal("needs_changes"), v.literal("hide")),
    categories: v.array(v.string()),
    confidence: v.number(),
    reasons: v.array(v.string()),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    return await ctx.db.insert("moderationReviews", {
      ...args,
      categories: args.categories.slice(0, 6),
      reasons: args.reasons.slice(0, 5).map((reason) => reason.slice(0, 300)),
      confidence: Math.max(0, Math.min(1, args.confidence)),
      reviewedAt: Date.now(),
      requestedBy: admin._id,
    });
  },
});

// The admin's call on the latest review: keep the post, or hide it (the post's status is
// changed with posts.updatePost, which also e-mails the author).
export const decide = mutation({
  args: { reviewId: v.id("moderationReviews"), decision: v.union(v.literal("kept"), v.literal("hidden")) },
  handler: async (ctx, { reviewId, decision }) => {
    const admin = await requireAdmin(ctx);
    const review = await ctx.db.get(reviewId);
    if (!review) throw new ConvexError("Review not found");
    await ctx.db.patch(reviewId, { decision, decidedBy: admin._id, decidedAt: Date.now() });
  },
});

// The latest review of every post that has one, for the admin's Moderation tab.
export const latestReviews = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const reviews = await ctx.db.query("moderationReviews").order("desc").collect();
    const latest = new Map<string, (typeof reviews)[number]>();
    for (const review of reviews) {
      const current = latest.get(review.postId);
      if (!current || review.reviewedAt > current.reviewedAt) latest.set(review.postId, review);
    }
    return [...latest.values()].map((review) => ({
      id: review._id,
      postId: review.postId,
      verdict: review.verdict,
      categories: review.categories,
      confidence: review.confidence,
      reasons: review.reasons,
      reviewedAt: review.reviewedAt,
      decision: review.decision ?? null,
    }));
  },
});
