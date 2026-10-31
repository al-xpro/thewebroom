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
      v.union(v.literal("published"), v.literal("draft"), v.literal("hidden"), v.literal("flagged"), v.literal("scheduled"))
    ),
    // Scheduled posts (#60): when they go out, and the job that publishes them.
    publishAt: v.optional(v.number()),
    scheduledJobId: v.optional(v.id("_scheduled_functions")),
    contentHtml: v.optional(v.string()),
    topic: topicValidator,
    // Written or edited with an agent (MCP) or the writing assistant; shown on the post.
    aiAssisted: v.optional(v.boolean()),
    // When followers were told about the post, so republishing doesn't tell them twice.
    announcedAt: v.optional(v.number()),
    // A multi-part post: the series it belongs to and its place in it (1, 2, …).
    seriesId: v.optional(v.id("series")),
    seriesPart: v.optional(v.number()),
  })
    .searchIndex("search_title", { searchField: "title" })
    .searchIndex("search_body", { searchField: "body" })
    .index("by_slug", ["slug"])
    .index("by_authorId", ["authorId"])
    .index("by_series", ["seriesId", "seriesPart"]),

  // Posts a member saved to read later.
  bookmarks: defineTable({
    userId: v.string(),
    postId: v.id("posts"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_user_post", ["userId", "postId"])
    .index("by_post", ["postId"]),

  // One reaction, "helpful". Readers see only their own; the author sees the count.
  reactions: defineTable({
    userId: v.string(),
    postId: v.id("posts"),
    kind: v.literal("helpful"),
    createdAt: v.number(),
  })
    .index("by_user_post", ["userId", "postId"])
    .index("by_post", ["postId"]),

  // Multi-part posts by one author, in order.
  series: defineTable({
    authorId: v.string(),
    title: v.string(),
    slug: v.string(),
    createdAt: v.number(),
  })
    .index("by_author", ["authorId"])
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
    parentId: v.optional(v.id("comments")),
    status: v.optional(v.union(v.literal("visible"), v.literal("hidden"))),
  }).index("by_authorId", ["authorId"]),

  rateLimits: defineTable({
    userId: v.string(),
    // Post image uploads, per hour (#19).
    uploadWindowStart: v.optional(v.number()),
    uploadCount: v.optional(v.number()),
    postWindowStart: v.optional(v.number()),
    postCount: v.optional(v.number()),
    commentWindowStart: v.optional(v.number()),
    commentCount: v.optional(v.number()),
    followWindowStart: v.optional(v.number()),
    followCount: v.optional(v.number()),
    // Agents (MCP): drafts written and drafts changed, per account and day.
    agentDraftWindowStart: v.optional(v.number()),
    agentDraftCount: v.optional(v.number()),
    agentUpdateWindowStart: v.optional(v.number()),
    agentUpdateCount: v.optional(v.number()),
    // The writing assistant in the editor, per account and day.
    assistantWindowStart: v.optional(v.number()),
    assistantCount: v.optional(v.number()),
  }).index("by_userId", ["userId"]),

  // Tokens members create for their agents (MCP). Only a hash is stored; the token is
  // shown once.
  agentTokens: defineTable({
    userId: v.string(),
    name: v.string(),
    tokenHash: v.string(),
    // The first characters, so a member can tell tokens apart.
    prefix: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    requestWindowStart: v.optional(v.number()),
    requestCount: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_tokenHash", ["tokenHash"]),

  // What happened that involves a member: comments on their posts, replies, new
  // followers, new posts from people and topics they follow.
  notifications: defineTable({
    userId: v.string(),
    kind: v.union(
      v.literal("comment"),
      v.literal("reply"),
      v.literal("follower"),
      v.literal("post"),
      v.literal("published"),
      v.literal("helpful")
    ),
    actorId: v.optional(v.string()),
    actorName: v.optional(v.string()),
    postId: v.optional(v.id("posts")),
    postSlug: v.optional(v.string()),
    postTitle: v.optional(v.string()),
    createdAt: v.number(),
    readAt: v.optional(v.number()),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_user_unread", ["userId", "readAt"]),

  // Reports from members on posts and comments; an admin resolves them.
  reports: defineTable({
    reporterId: v.string(),
    targetType: v.union(v.literal("post"), v.literal("comment")),
    targetId: v.string(),
    reason: v.union(
      v.literal("spam"),
      v.literal("harassment"),
      v.literal("plagiarism"),
      v.literal("off-topic"),
      v.literal("other")
    ),
    status: v.union(v.literal("open"), v.literal("resolved"), v.literal("dismissed")),
    createdAt: v.number(),
    resolvedBy: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_target", ["targetType", "targetId"])
    .index("by_reporter", ["reporterId", "createdAt"]),

  // The moderation agent's review of a post, and what an admin decided. The agent never
  // hides or deletes anything; an admin does.
  moderationReviews: defineTable({
    postId: v.id("posts"),
    verdict: v.union(v.literal("ok"), v.literal("needs_changes"), v.literal("hide")),
    categories: v.array(v.string()),
    confidence: v.number(),
    reasons: v.array(v.string()),
    model: v.string(),
    reviewedAt: v.number(),
    requestedBy: v.string(),
    decision: v.optional(v.union(v.literal("kept"), v.literal("hidden"))),
    decidedBy: v.optional(v.string()),
    decidedAt: v.optional(v.number()),
  }).index("by_post", ["postId", "reviewedAt"]),

  // Post images uploaded through generateImageUploadUrl, checked by registerPostImage
  // (#19): who uploaded each file, and the post it's attached to.
  uploads: defineTable({
    storageId: v.id("_storage"),
    userId: v.string(),
    createdAt: v.number(),
    postId: v.optional(v.id("posts")),
  })
    .index("by_storageId", ["storageId"])
    .index("by_createdAt", ["createdAt"]),

  // Newsletter sign-ups: one row per address.
  newsletterSubscribers: defineTable({
    email: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // Uploaded profile photos (#95): one per member, stored by convex/avatars.ts.
  avatars: defineTable({
    userId: v.string(),
    storageId: v.id("_storage"),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  // Who follows what (#59). Topics now; people (#28) use the same table.
  follows: defineTable({
    followerId: v.string(),
    targetType: v.union(v.literal("topic"), v.literal("user")),
    targetId: v.string(),
    createdAt: v.number(),
  })
    .index("by_follower", ["followerId", "targetType", "targetId"])
    .index("by_target", ["targetType", "targetId"]),

  accountCreationLimits: defineTable({
    ipAddress: v.string(),
    createdAt: v.number(),
    accountEmail: v.string(),
  })
    .index("by_ipAddress", ["ipAddress"])
    .index("by_email", ["accountEmail"]),

  // Sign-ups refused because the address already has an account (#65), counted per IP.
  existingAccountSignUps: defineTable({
    ipAddress: v.string(),
    attemptedAt: v.number(),
  }).index("by_ipAddress", ["ipAddress"]),

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

  // Unused since #65: better-auth verifies e-mail now. Empty it with
  // migrations:deleteEmailVerificationTokens, then remove this table.
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
