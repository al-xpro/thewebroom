import { internalMutation, query } from "./_generated/server";
import { authComponent } from "./auth";

/**
 * Rate Limit Configuration
 * Posts: 2 per 24 hours (enforced in posts.createPost)
 * Comments: 3 per 6 hours (enforced in comment.createComment)
 * Account Creation: 1 per IP per 24 hours (enforced in auth.registerSignUp)
 * OTP Requests: 3 per email per 24 hours (see passwordReset.ts)
 */
const POST_RATE_LIMIT = 2;
const POST_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

const COMMENT_RATE_LIMIT = 3;
const COMMENT_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Get rate limit status for the signed-in user
 */
export const getRateLimitStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;

    const rateLimit = await ctx.db
      .query("rateLimits")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!rateLimit) {
      return {
        postsRemaining: POST_RATE_LIMIT,
        commentsRemaining: COMMENT_RATE_LIMIT,
        postResetAt: Date.now() + POST_WINDOW_MS,
        commentResetAt: Date.now() + COMMENT_WINDOW_MS,
      };
    }

    const now = Date.now();

    // Calculate posts remaining
    const postWindowStart = rateLimit.postWindowStart || now;
    const postWindowElapsed = now - postWindowStart;
    const postWindowExpired = postWindowElapsed > POST_WINDOW_MS;
    const postCount = postWindowExpired ? 0 : rateLimit.postCount || 0;
    const postResetAt = postWindowExpired
      ? now + POST_WINDOW_MS
      : postWindowStart + POST_WINDOW_MS;

    // Calculate comments remaining
    const commentWindowStart = rateLimit.commentWindowStart || now;
    const commentWindowElapsed = now - commentWindowStart;
    const commentWindowExpired = commentWindowElapsed > COMMENT_WINDOW_MS;
    const commentCount = commentWindowExpired ? 0 : rateLimit.commentCount || 0;
    const commentResetAt = commentWindowExpired
      ? now + COMMENT_WINDOW_MS
      : commentWindowStart + COMMENT_WINDOW_MS;

    return {
      postsRemaining: Math.max(0, POST_RATE_LIMIT - postCount),
      commentsRemaining: Math.max(0, COMMENT_RATE_LIMIT - commentCount),
      postResetAt,
      commentResetAt,
    };
  },
});

/**
 * Clean up old rate limit records (daily, from convex/crons.ts)
 */
export const cleanupOldRateLimitRecords = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Clean up account creation limits older than 30 days
    const oldCreations = await ctx.db
      .query("accountCreationLimits")
      .collect();

    for (const creation of oldCreations) {
      if (creation.createdAt < thirtyDaysAgo) {
        await ctx.db.delete(creation._id);
      }
    }

    const dayAgo = now - 24 * 60 * 60 * 1000;
    const oldSignUps = await ctx.db.query("existingAccountSignUps").collect();
    for (const attempt of oldSignUps) {
      if (attempt.attemptedAt < dayAgo) await ctx.db.delete(attempt._id);
    }

    // Clean up expired OTP lockouts
    const otpLockouts = await ctx.db.query("otpLockouts").collect();
    for (const lockout of otpLockouts) {
      if (lockout.lockedUntil < now) {
        await ctx.db.delete(lockout._id);
      }
    }

    return { success: true };
  },
});
