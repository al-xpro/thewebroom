import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { topicValidator } from "./topics";

export default defineSchema({
  posts: defineTable({
    title: v.string(),
    slug: v.optional(v.string()),
    body: v.string(),
    subtitle: v.string(),
    minRead: v.optional(v.number()),
    authorId: v.string(),
    authorName: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
    status: v.optional(
      v.union(v.literal("published"), v.literal("draft"), v.literal("hidden"), v.literal("flagged"))
    ),
    contentHtml: v.optional(v.string()),
    topic: topicValidator,
  })
    .searchIndex("search_title", { searchField: "title" })
    .searchIndex("search_body", { searchField: "body" })
    .index("by_slug", ["slug"])
    .index("by_authorId", ["authorId"]),

  presences: defineTable({
    userId: v.string(),
    roomId: v.string(),
    sessionId: v.string(),
  }),

  comments: defineTable({
    postId: v.id("posts"),
    authorId: v.string(),
    authorName: v.string(),
    body: v.string(),
    parentId: v.optional(v.id("comments")),
    status: v.optional(v.union(v.literal("visible"), v.literal("hidden"))),
  }),

  rateLimits: defineTable({
    userId: v.string(),
    postWindowStart: v.optional(v.number()),
    postCount: v.optional(v.number()),
    commentWindowStart: v.optional(v.number()),
    commentCount: v.optional(v.number()),
  }).index("by_userId", ["userId"]),

  accountCreationLimits: defineTable({
    ipAddress: v.string(),
    createdAt: v.number(),
    accountEmail: v.string(),
  })
    .index("by_ipAddress", ["ipAddress"])
    .index("by_email", ["accountEmail"]),

  otpLockouts: defineTable({
    email: v.string(),
    lockedUntil: v.number(),
    reason: v.string(),
  }).index("by_email", ["email"]),

  // FIX: removed plain-text `otp` field — only `otpHash` stored.
  // If you have existing records with `otp`, run the migration in
  // convex/migrations.ts before deploying this schema change.
  passwordResetOtps: defineTable({
    email: v.string(),
    otpHash: v.string(), 
    expiresAt: v.number(),
    attempts: v.number(),
    sentAt: v.optional(v.number()),
  }).index("by_email", ["email"]),

  passwordResetSessions: defineTable({
    email: v.string(),
    tokenHash: v.string(),
    expiresAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_tokenHash", ["tokenHash"]),

  deleteAccountReauthChallenges: defineTable({
    userId: v.string(),
    provider: v.literal("github"),
    tokenHash: v.string(),
    sourceSessionId: v.string(),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_tokenHash", ["tokenHash"]),

  deleteAccountReauthGrants: defineTable({
    userId: v.string(),
    provider: v.literal("github"),
    expiresAt: v.number(),
  }).index("by_userId", ["userId"]),

  onboardingCompletions: defineTable({
    userId: v.string(),
    displayName: v.string(),
    completedAt: v.number(),
  }).index("by_userId", ["userId"]),

  passwordResetRequestLimits: defineTable({
    email: v.string(),
    requestCount: v.number(),
    windowStartedAt: v.number(),
  }).index("by_email", ["email"]),

  bannedUsers: defineTable({
    email: v.string(),
    userId: v.optional(v.string()),
    reason: v.optional(v.string()),
    active: v.boolean(),
    bannedAt: v.number(),
    bannedByUserId: v.string(),
    notifiedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_userId", ["userId"])
    .index("by_active", ["active"]),

  bannedIps: defineTable({
    ipAddress: v.string(),
    reason: v.optional(v.string()),
    active: v.boolean(),
    bannedAt: v.number(),
    bannedByUserId: v.string(),
  }).index("by_ipAddress", ["ipAddress"]),

  emailVerificationTokens: defineTable({
    userId: v.string(),
    tokenHash: v.string(),
    email: v.string(),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
  })
    .index("by_tokenHash", ["tokenHash"])
    .index("by_userId", ["userId"])
    .index("by_email", ["email"]),
});
