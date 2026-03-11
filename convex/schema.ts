import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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
      v.union(
        v.literal("published"),
        v.literal("hidden"),
        v.literal("flagged")
      )
    ),
    contentHtml: v.optional(v.string()),
    topic: v.union(
      v.literal("Web Architecture"),
      v.literal("UI Engineering"),
      v.literal("AI for Developers"),
      v.literal("Productivity")
    ),
  })
    .searchIndex("search_title", { searchField: "title" })
    .searchIndex("search_body", { searchField: "body" })
    .index("by_slug", ["slug"]),

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
    status: v.optional(v.union(v.literal("visible"), v.literal("hidden"))),
  }),

  rateLimits: defineTable({
    userId: v.string(),
    // Posts: max 2 per 24 hours
    postWindowStart: v.optional(v.number()),
    postCount: v.optional(v.number()),
    // Comments: max 3 per 6 hours
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

  passwordResetOtps: defineTable({
    email: v.string(),
    otpHash: v.optional(v.string()),
    otp: v.optional(v.string()),
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
});
