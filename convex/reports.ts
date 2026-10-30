import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { assertUserNotBanned, authComponent, isAdminUserRecord } from "./auth";

const REPORTS_PER_DAY = 10;
const DAY = 24 * 60 * 60 * 1000;

const targetType = v.union(v.literal("post"), v.literal("comment"));
const reason = v.union(
  v.literal("spam"),
  v.literal("harassment"),
  v.literal("plagiarism"),
  v.literal("off-topic"),
  v.literal("other")
);

// A member flags a post or a comment. Each member counts once per item; 10 reports a day.
export const report = mutation({
  args: { targetType, targetId: v.string(), reason },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    await assertUserNotBanned(ctx, user);

    const authorId =
      args.targetType === "post"
        ? (await ctx.db.get(args.targetId as Id<"posts">))?.authorId
        : (await ctx.db.get(args.targetId as Id<"comments">))?.authorId;
    if (!authorId) throw new ConvexError("This is no longer here");
    if (authorId === user._id) throw new ConvexError("You can't report your own writing");

    const existing = await ctx.db
      .query("reports")
      .withIndex("by_target", (q) => q.eq("targetType", args.targetType).eq("targetId", args.targetId))
      .collect();
    if (existing.some((r) => r.reporterId === user._id && r.status === "open")) return { ok: true };

    const today = await ctx.db
      .query("reports")
      .withIndex("by_reporter", (q) => q.eq("reporterId", user._id).gt("createdAt", Date.now() - DAY))
      .collect();
    if (today.length >= REPORTS_PER_DAY) throw new ConvexError("You've sent a lot of reports today. Try tomorrow.");

    await ctx.db.insert("reports", {
      reporterId: user._id,
      targetType: args.targetType,
      targetId: args.targetId,
      reason: args.reason,
      status: "open",
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

// Open reports grouped by item, most reported first, for the admin.
export const listOpenReports = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user || !isAdminUserRecord(user)) throw new ConvexError("Not authorized");

    const open = await ctx.db.query("reports").withIndex("by_status", (q) => q.eq("status", "open")).collect();
    const groups = new Map<string, typeof open>();
    for (const r of open) {
      const key = `${r.targetType}:${r.targetId}`;
      groups.set(key, [...(groups.get(key) ?? []), r]);
    }

    const items = [];
    for (const reports of groups.values()) {
      const { targetType, targetId } = reports[0];
      const reasons = [...new Set(reports.map((r) => r.reason))];
      const latest = Math.max(...reports.map((r) => r.createdAt));
      if (targetType === "post") {
        const post = await ctx.db.get(targetId as Id<"posts">);
        if (!post) continue;
        items.push({
          targetType,
          targetId,
          count: reports.length,
          reasons,
          latest,
          title: post.title,
          excerpt: post.subtitle ?? "",
          author: post.authorName,
          slug: post.slug,
          status: post.status ?? "published",
        });
      } else {
        const comment = await ctx.db.get(targetId as Id<"comments">);
        if (!comment) continue;
        const post = await ctx.db.get(comment.postId);
        items.push({
          targetType,
          targetId,
          count: reports.length,
          reasons,
          latest,
          title: `Comment on “${post?.title ?? "a post"}”`,
          excerpt: comment.body,
          author: comment.authorName,
          slug: post?.slug,
          status: comment.status ?? "visible",
        });
      }
    }
    return items.sort((a, b) => b.count - a.count || b.latest - a.latest);
  },
});

// Closes every open report on an item: "resolved" after acting on it, "dismissed" when it's fine.
export const closeReports = mutation({
  args: { targetType, targetId: v.string(), outcome: v.union(v.literal("resolved"), v.literal("dismissed")) },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!isAdminUserRecord(user)) throw new ConvexError("Not authorized");
    const open = await ctx.db
      .query("reports")
      .withIndex("by_target", (q) => q.eq("targetType", args.targetType).eq("targetId", args.targetId))
      .collect();
    for (const r of open) {
      if (r.status !== "open") continue;
      await ctx.db.patch(r._id, { status: args.outcome, resolvedBy: user._id, resolvedAt: Date.now() });
    }
  },
});
