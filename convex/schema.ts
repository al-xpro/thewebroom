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
    lastPostTime: v.optional(v.number()),
    lastCommentTime: v.optional(v.number()),
    dailyPostCount: v.optional(v.number()),
    hourlyCommentCount: v.optional(v.number()),
  }).index("by_userId", ["userId"]),

  passwordResetOtps: defineTable({
    email: v.string(),
    otpHash: v.optional(v.string()),
    // Legacy field kept optional to avoid deployment/runtime break on old documents.
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

  newsletterSubscriptions: defineTable({
    email: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),
});
