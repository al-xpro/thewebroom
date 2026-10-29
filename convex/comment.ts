import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { assertUserNotBanned, authComponent, isAdminUserRecord } from "./auth";
import { components } from "./_generated/api";
import { getAvatarUrls } from "./avatars";

const COMMENT_MAX_LENGTH = 300;

// Each comment's author photo: uploaded (#95), then GitHub's. The UI falls back to a
// generated one.
async function withAuthorAvatars<T extends { authorId: string }>(ctx: QueryCtx, comments: T[]) {
  const uploaded = await getAvatarUrls(ctx, comments.map((c) => c.authorId));
  const github = new Map<string, string>();
  for (const authorId of new Set(comments.map((c) => c.authorId))) {
    if (uploaded.has(authorId)) continue;
    const author = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", operator: "eq", value: authorId }],
    })) as { image?: string | null } | null;
    if (author?.image) github.set(authorId, author.image);
  }
  return comments.map((c) => ({
    ...c,
    authorAvatarUrl: uploaded.get(c.authorId) ?? github.get(c.authorId) ?? null,
  }));
}

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
    const comments = await ctx.db
      .query("comments")
      .filter((q) => q.eq(q.field("postId"), args.postId))
      .order("desc")
      .collect();
    return await withAuthorAvatars(ctx, comments);
  },
});

export const getVisibleCommentsByPostId = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .filter((q) =>
        q.and(q.eq(q.field("postId"), args.postId), q.eq(q.field("status"), "visible"))
      )
      .order("desc")
      .collect();
    return await withAuthorAvatars(ctx, comments);
  },
});

export const createComment = mutation({
  args: {
    body: v.string(),
    postId: v.id("posts"),
    parentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) throw new ConvexError("Not authenticated");

    await assertUserNotBanned(ctx, { _id: user._id, email: user.email });

    // Server-side length validation — enforced regardless of client schema
    const body = args.body.trim();
    if (body.length === 0) throw new ConvexError("Comment cannot be empty");
    if (body.length > COMMENT_MAX_LENGTH) {
      throw new ConvexError(`Comment cannot exceed ${COMMENT_MAX_LENGTH} characters`);
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
      parentId: args.parentId,
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
      throw new ConvexError(`Comment cannot exceed ${COMMENT_MAX_LENGTH} characters`);
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

    // Delete all replies to this comment first
    const replies = await ctx.db
      .query("comments")
      .filter((q) => q.eq(q.field("parentId"), args.commentId))
      .collect();
    await Promise.all(replies.map((r) => ctx.db.delete(r._id)));

    await ctx.db.delete(args.commentId);
    return args.commentId;
  },
});
