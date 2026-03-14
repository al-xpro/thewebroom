import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertUserNotBanned, authComponent, isAdminUserRecord } from "./auth";

const COMMENT_MAX_LENGTH = 300;

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
    return isAdminUserRecord(user);
  },
});

export const getCommentsByPostId = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("comments")
      .filter((q) => q.eq(q.field("postId"), args.postId))
      .order("desc")
      .collect();
  },
});

export const getVisibleCommentsByPostId = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("comments")
      .filter((q) =>
        q.and(
          q.eq(q.field("postId"), args.postId),
          q.eq(q.field("status"), "visible")
        )
      )
      .order("desc")
      .collect();
  },
});

export const createComment = mutation({
  args: {
    body: v.string(),
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");

    await assertUserNotBanned(ctx, { _id: user._id, email: user.email });

    // Server-side length validation — enforced regardless of client schema
    const body = args.body.trim();
    if (body.length === 0) throw new ConvexError("Comment cannot be empty");
    if (body.length > COMMENT_MAX_LENGTH) {
      throw new ConvexError(
        `Comment cannot exceed ${COMMENT_MAX_LENGTH} characters`
      );
    }

    // Rate limit
    const rateLimit = await ctx.db
      .query("rateLimits")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    const now = Date.now();
    const COMMENT_RATE_LIMIT = 3;
    const COMMENT_WINDOW_MS = 6 * 60 * 60 * 1000;

    if (rateLimit) {
      const windowStart = rateLimit.commentWindowStart || now;
      const timeSinceWindowStart = now - windowStart;

      if (timeSinceWindowStart <= COMMENT_WINDOW_MS) {
        const currentCount = rateLimit.commentCount || 0;
        if (currentCount >= COMMENT_RATE_LIMIT) {
          const timeUntilReset = COMMENT_WINDOW_MS - timeSinceWindowStart;
          throw new ConvexError(
            `You can only post ${COMMENT_RATE_LIMIT} comments every 6 hours. Please try again in ${Math.ceil(timeUntilReset / 60000)} minutes.`
          );
        }
      }
    }

    const commentId = await ctx.db.insert("comments", {
      postId: args.postId,
      body,
      authorId: user._id,
      authorName: user.name || "",
      status: "visible",
    });

    // Update rate limit
    if (rateLimit) {
      const windowStart = rateLimit.commentWindowStart || now;
      const timeSinceWindowStart = now - windowStart;
      if (timeSinceWindowStart > COMMENT_WINDOW_MS) {
        await ctx.db.patch(rateLimit._id, { commentWindowStart: now, commentCount: 1 });
      } else {
        await ctx.db.patch(rateLimit._id, {
          commentCount: (rateLimit.commentCount || 0) + 1,
        });
      }
    } else {
      await ctx.db.insert("rateLimits", {
        userId: user._id,
        commentWindowStart: now,
        commentCount: 1,
      });
    }

    return commentId;
  },
});

export const updateComment = mutation({
  args: {
    commentId: v.id("comments"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new ConvexError("Comment not found");

    const isOwner = comment.authorId.toString() === user._id.toString();
    if (!isOwner && !isAdminUserRecord(user)) {
      throw new ConvexError("Not authorized to edit this comment");
    }

    // Server-side length validation on update too
    const body = args.body.trim();
    if (body.length === 0) throw new ConvexError("Comment cannot be empty");
    if (body.length > COMMENT_MAX_LENGTH) {
      throw new ConvexError(
        `Comment cannot exceed ${COMMENT_MAX_LENGTH} characters`
      );
    }

    await ctx.db.patch(args.commentId, { body });
    return args.commentId;
  },
});

export const deleteComment = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new ConvexError("Comment not found");

    const isOwner = comment.authorId.toString() === user._id.toString();
    if (!isOwner && !isAdminUserRecord(user)) {
      throw new ConvexError("Not authorized to delete this comment");
    }

    await ctx.db.delete(args.commentId);
    return args.commentId;
  },
});