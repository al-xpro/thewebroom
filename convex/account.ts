import { query } from "./_generated/server";
import { authComponent } from "./auth";

// A member's own data: everything they can download (#20), and the parts of account
// deletion that cover the tables added after the original cascade.

// Everything the platform holds about the signed-in member, as JSON.
export const exportMyData = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx).catch(() => null);
    if (!user) return null;
    const id = user._id;

    const posts = await ctx.db.query("posts").withIndex("by_authorId", (q) => q.eq("authorId", id)).collect();
    const comments = await ctx.db.query("comments").withIndex("by_authorId", (q) => q.eq("authorId", id)).collect();
    const follows = await ctx.db.query("follows").withIndex("by_follower", (q) => q.eq("followerId", id)).collect();
    const bookmarks = await ctx.db.query("bookmarks").withIndex("by_user", (q) => q.eq("userId", id)).collect();
    const notifications = await ctx.db.query("notifications").withIndex("by_user", (q) => q.eq("userId", id)).collect();
    const series = await ctx.db.query("series").withIndex("by_author", (q) => q.eq("authorId", id)).collect();
    const tokens = await ctx.db.query("agentTokens").withIndex("by_userId", (q) => q.eq("userId", id)).collect();
    const reactions = (await ctx.db.query("reactions").collect()).filter((r) => r.userId === id);
    const reports = await ctx.db.query("reports").withIndex("by_reporter", (q) => q.eq("reporterId", id)).collect();

    const date = (time?: number) => (time === undefined ? null : new Date(time).toISOString());
    return {
      exportedAt: new Date().toISOString(),
      account: { id, name: user.name, email: user.email, emailVerified: user.emailVerified, createdAt: date(user.createdAt as unknown as number) },
      posts: posts.map((p) => ({
        title: p.title,
        subtitle: p.subtitle,
        topic: p.topic,
        status: p.status ?? "published",
        slug: p.slug,
        body: p.body,
        html: p.contentHtml ?? null,
        aiAssisted: Boolean(p.aiAssisted),
        createdAt: date(p._creationTime),
        publishAt: date(p.publishAt),
      })),
      comments: comments.map((c) => ({ postId: c.postId, body: c.body, createdAt: date(c._creationTime), status: c.status ?? "visible" })),
      follows: follows.map((f) => ({ type: f.targetType, target: f.targetId, since: date(f.createdAt) })),
      readingList: bookmarks.map((b) => ({ postId: b.postId, savedAt: date(b.createdAt) })),
      helpful: reactions.map((r) => ({ postId: r.postId, at: date(r.createdAt) })),
      series: series.map((s) => ({ title: s.title, slug: s.slug, createdAt: date(s.createdAt) })),
      notifications: notifications.map((n) => ({ kind: n.kind, postTitle: n.postTitle ?? null, at: date(n.createdAt), read: n.readAt !== undefined })),
      agentTokens: tokens.map((t) => ({ name: t.name, createdAt: date(t.createdAt), lastUsedAt: date(t.lastUsedAt), revoked: t.revokedAt !== undefined })),
      reports: reports.map((r) => ({ targetType: r.targetType, reason: r.reason, status: r.status, at: date(r.createdAt) })),
    };
  },
});
