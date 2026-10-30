import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { authComponent } from "./auth";
import { getAvatarUrls } from "./avatars";

// What involves a member: comments on their posts, replies to their comments, new
// followers, new posts from people and topics they follow, and their scheduled posts
// going out. Nothing is sent by e-mail; it's all on /notifications.

const MAX_FAN_OUT = 1000;

type NewNotification = Omit<Doc<"notifications">, "_id" | "_creationTime" | "createdAt" | "readAt">;

export async function notify(ctx: MutationCtx, notification: NewNotification) {
  // Never about your own actions.
  if (notification.actorId && notification.actorId === notification.userId) return;
  await ctx.db.insert("notifications", { ...notification, createdAt: Date.now() });
}

// Tells the author's followers and the topic's followers about a newly published post,
// once per post.
export async function announcePost(ctx: MutationCtx, postId: Id<"posts">) {
  const post = await ctx.db.get(postId);
  if (!post || post.announcedAt !== undefined) return;
  if (post.status !== undefined && post.status !== "published") return;
  await ctx.db.patch(post._id, { announcedAt: Date.now() });

  const [byAuthor, byTopic] = await Promise.all([
    ctx.db
      .query("follows")
      .withIndex("by_target", (q) => q.eq("targetType", "user").eq("targetId", post.authorId))
      .take(MAX_FAN_OUT),
    ctx.db
      .query("follows")
      .withIndex("by_target", (q) => q.eq("targetType", "topic").eq("targetId", post.topic))
      .take(MAX_FAN_OUT),
  ]);
  const recipients = new Set([...byAuthor, ...byTopic].map((follow) => follow.followerId));
  recipients.delete(post.authorId);
  for (const userId of recipients) {
    await ctx.db.insert("notifications", {
      userId,
      kind: "post",
      actorId: post.authorId,
      actorName: post.authorName,
      postId: post._id,
      postSlug: post.slug,
      postTitle: post.title,
      createdAt: Date.now(),
    });
  }
}

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx).catch(() => null);
    if (!user) return [];
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100);
    const avatars = await getAvatarUrls(ctx, rows.flatMap((row) => (row.actorId ? [row.actorId] : [])));
    return rows.map((row) => ({
      id: row._id,
      kind: row.kind,
      actorId: row.actorId ?? null,
      actorName: row.actorName ?? null,
      actorAvatarUrl: row.actorId ? (avatars.get(row.actorId) ?? null) : null,
      postSlug: row.postSlug ?? null,
      postTitle: row.postTitle ?? null,
      createdAt: row.createdAt,
      unread: row.readAt === undefined,
    }));
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx).catch(() => null);
    if (!user) return 0;
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", user._id).eq("readAt", undefined))
      .take(100);
    return unread.length;
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", user._id).eq("readAt", undefined))
      .take(500);
    const now = Date.now();
    for (const row of unread) await ctx.db.patch(row._id, { readAt: now });
  },
});

export const markRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, { id }) => {
    const user = await authComponent.getAuthUser(ctx);
    const row = await ctx.db.get(id);
    if (row && row.userId === user._id && row.readAt === undefined) await ctx.db.patch(id, { readAt: Date.now() });
  },
});
