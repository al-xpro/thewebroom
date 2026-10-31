import type { MutationCtx } from "./_generated/server";

// Called by auth.deleteAccountCascade: the member's follows (both ways), reading list,
// reactions, notifications, series, agent tokens, reports and newsletter subscription. Posts, comments, photos and
// limits are deleted by the cascade itself.
export async function deleteMemberActivity(ctx: MutationCtx, userId: string, email: string) {
  const rows = [
    ...(await ctx.db.query("follows").withIndex("by_follower", (q) => q.eq("followerId", userId)).collect()),
    ...(await ctx.db.query("follows").withIndex("by_target", (q) => q.eq("targetType", "user").eq("targetId", userId)).collect()),
    ...(await ctx.db.query("bookmarks").withIndex("by_user", (q) => q.eq("userId", userId)).collect()),
    ...(await ctx.db.query("notifications").withIndex("by_user", (q) => q.eq("userId", userId)).collect()),
    ...(await ctx.db.query("series").withIndex("by_author", (q) => q.eq("authorId", userId)).collect()),
    ...(await ctx.db.query("agentTokens").withIndex("by_userId", (q) => q.eq("userId", userId)).collect()),
    ...(await ctx.db.query("reports").withIndex("by_reporter", (q) => q.eq("reporterId", userId)).collect()),
    ...(await ctx.db.query("reactions").collect()).filter((reaction) => reaction.userId === userId),
    ...(await ctx.db
      .query("newsletterSubscribers")
      .withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase()))
      .collect()),
  ];
  for (const row of rows) await ctx.db.delete(row._id);
}
