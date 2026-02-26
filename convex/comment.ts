import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

const ADMIN_USER_ID = process.env.ADMIN_USER_ID || "";

const isAdmin = (userId: string) => userId.toString() === ADMIN_USER_ID;

export const getIsAdmin = query({
  args: {},
  handler: async (ctx) => {
    let user;
    try {
      user = await authComponent.getAuthUser(ctx);
    } catch {
      return false;
    }
    if (!user) return false;

    return user._id.toString() === ADMIN_USER_ID;
  },
});

export const getCommentsByPostId = query({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query("comments")
      .filter((q) => q.eq(q.field("postId"), args.postId))
      .order("desc")
      .collect();

    return data;
  },
});

export const getVisibleCommentsByPostId = query({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const data = await ctx.db
      .query("comments")
      .filter((q) =>
        q.and(
          q.eq(q.field("postId"), args.postId),
          q.eq(q.field("status"), "visible")
        )
      )
      .order("desc")
      .collect();

    return data;
  },
});

export const createComment = mutation({
  args: {
    body: v.string(),
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new ConvexError("Not authenticated");
    }

    const rateLimit = await ctx.db
      .query("rateLimits")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    const now = Date.now();
    const COMMENT_COOLDOWN_MS = 24 * 60 * 60 * 1000;
    const COMMENT_RATE_LIMIT = 3;

    if (rateLimit) {
      const timeSinceLastComment = now - (rateLimit.lastCommentTime || 0);
      const dailyCount =
        timeSinceLastComment > COMMENT_COOLDOWN_MS ? 0 : rateLimit.hourlyCommentCount || 0;

      if (dailyCount >= COMMENT_RATE_LIMIT) {
        throw new ConvexError(
          `Rate limit exceeded. You can post ${COMMENT_RATE_LIMIT} comments per day.`
        );
      }

      await ctx.db.patch(rateLimit._id, {
        lastCommentTime: now,
        hourlyCommentCount: dailyCount + 1,
      });
    } else {
      await ctx.db.insert("rateLimits", {
        userId: user._id,
        lastCommentTime: now,
        hourlyCommentCount: 1,
      });
    }

    return await ctx.db.insert("comments", {
      postId: args.postId,
      body: args.body,
      authorId: user._id,
      authorName: user.name || "",
      status: "visible",
    });
  },
});

export const updateComment = mutation({
  args: {
    commentId: v.id("comments"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new ConvexError("Not authenticated");
    }

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new ConvexError("Comment not found");
    }

    const isOwner = comment.authorId.toString() === user._id.toString();
    if (!isOwner && !isAdmin(user._id.toString())) {
      throw new ConvexError("Not authorized to edit this comment");
    }

    await ctx.db.patch(args.commentId, { body: args.body });
    return args.commentId;
  },
});

export const deleteComment = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new ConvexError("Not authenticated");
    }

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new ConvexError("Comment not found");
    }

    const isOwner = comment.authorId.toString() === user._id.toString();
    if (!isOwner && !isAdmin(user._id.toString())) {
      throw new ConvexError("Not authorized to delete this comment");
    }

    await ctx.db.delete(args.commentId);
    return args.commentId;
  },
});