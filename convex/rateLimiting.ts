import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Rate Limit Configuration
 * Posts: 2 per 24 hours
 * Comments: 3 per 6 hours
 * Account Creation: 1 per IP per 24 hours
 * OTP Requests: 3 per email per 24 hours (see passwordReset.ts)
 */
const POST_RATE_LIMIT = 2;
const POST_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

const COMMENT_RATE_LIMIT = 3;
const COMMENT_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours

const ACCOUNT_CREATION_RATE_LIMIT = 1;
const ACCOUNT_CREATION_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if user can publish a post
 * Returns: { allowed: boolean, remaining: number, resetAt?: number }
 */
export const checkPostRateLimit = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const rateLimit = await ctx.db
      .query("rateLimits")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();

    if (!rateLimit) {
      // First time - create new rate limit entry
      await ctx.db.insert("rateLimits", {
        userId: args.userId,
        postWindowStart: now,
        postCount: 1,
      });
      return {
        allowed: true,
        remaining: POST_RATE_LIMIT - 1,
        resetAt: now + POST_WINDOW_MS,
      };
    }

    const windowStart = rateLimit.postWindowStart || now;
    const timeSinceWindowStart = now - windowStart;

    // Reset window if 24 hours have passed
    if (timeSinceWindowStart > POST_WINDOW_MS) {
      await ctx.db.patch(rateLimit._id, {
        postWindowStart: now,
        postCount: 1,
      });
      return {
        allowed: true,
        remaining: POST_RATE_LIMIT - 1,
        resetAt: now + POST_WINDOW_MS,
      };
    }

    // Check current count within active window
    const currentCount = rateLimit.postCount || 0;

    if (currentCount >= POST_RATE_LIMIT) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: windowStart + POST_WINDOW_MS,
      };
    }

    // Increment counter
    await ctx.db.patch(rateLimit._id, {
      postCount: currentCount + 1,
    });

    return {
      allowed: true,
      remaining: POST_RATE_LIMIT - currentCount - 1,
      resetAt: windowStart + POST_WINDOW_MS,
    };
  },
});

/**
 * Check if user can publish a comment
 * Returns: { allowed: boolean, remaining: number, resetAt?: number }
 */
export const checkCommentRateLimit = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const rateLimit = await ctx.db
      .query("rateLimits")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();

    if (!rateLimit) {
      // First comment - create new rate limit entry
      await ctx.db.insert("rateLimits", {
        userId: args.userId,
        commentWindowStart: now,
        commentCount: 1,
      });
      return {
        allowed: true,
        remaining: COMMENT_RATE_LIMIT - 1,
        resetAt: now + COMMENT_WINDOW_MS,
      };
    }

    const windowStart = rateLimit.commentWindowStart || now;
    const timeSinceWindowStart = now - windowStart;

    // Reset window if 6 hours have passed
    if (timeSinceWindowStart > COMMENT_WINDOW_MS) {
      await ctx.db.patch(rateLimit._id, {
        commentWindowStart: now,
        commentCount: 1,
      });
      return {
        allowed: true,
        remaining: COMMENT_RATE_LIMIT - 1,
        resetAt: now + COMMENT_WINDOW_MS,
      };
    }

    // Check current count within active window
    const currentCount = rateLimit.commentCount || 0;

    if (currentCount >= COMMENT_RATE_LIMIT) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: windowStart + COMMENT_WINDOW_MS,
      };
    }

    // Increment counter
    await ctx.db.patch(rateLimit._id, {
      commentCount: currentCount + 1,
    });

    return {
      allowed: true,
      remaining: COMMENT_RATE_LIMIT - currentCount - 1,
      resetAt: windowStart + COMMENT_WINDOW_MS,
    };
  },
});

/**
 * Get rate limit status for the current user
 */
export const getRateLimitStatus = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const rateLimit = await ctx.db
      .query("rateLimits")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
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
 * Check account creation rate limit by IP address
 * NOTE: IP address must be extracted from request headers at Next.js API layer
 * and passed to this mutation
 */
export const checkAccountCreationRateLimit = mutation({
  args: { ipAddress: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneDayAgo = now - ACCOUNT_CREATION_WINDOW_MS;

    // Check if this IP has created an account in the last 24 hours
    const recentCreations = await ctx.db
      .query("accountCreationLimits")
      .withIndex("by_ipAddress", (q) => q.eq("ipAddress", args.ipAddress))
      .collect();

    const recentAttempt = recentCreations.find((creation) => creation.createdAt > oneDayAgo);

    if (recentAttempt) {
      return {
        allowed: false,
        reason: "Too many accounts created from this IP. Please try again later.",
        resetAt: recentAttempt.createdAt + ACCOUNT_CREATION_WINDOW_MS,
      };
    }

    // Record this account creation attempt
    await ctx.db.insert("accountCreationLimits", {
      ipAddress: args.ipAddress,
      accountEmail: args.email.toLowerCase().trim(),
      createdAt: now,
    });

    return {
      allowed: true,
      resetAt: now + ACCOUNT_CREATION_WINDOW_MS,
    };
  },
});

/**
 * Clean up old rate limit records (call via scheduled task)
 */
export const cleanupOldRateLimitRecords = mutation({
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
