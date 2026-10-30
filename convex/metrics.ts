import { ConvexError } from "convex/values";
import { query } from "./_generated/server";
import { authComponent, isAdminUserRecord } from "./auth";

// What a member did and when, for the admin's product metrics (active members, retention,
// posts per week). Only ids, kinds and times: no content.
export const activity = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx).catch(() => null);
    if (!user || !isAdminUserRecord(user)) throw new ConvexError("Not authorized");

    const [posts, comments, follows] = await Promise.all([
      ctx.db.query("posts").collect(),
      ctx.db.query("comments").collect(),
      ctx.db.query("follows").collect(),
    ]);

    const events: { userId: string; at: number; kind: "post" | "draft" | "comment" | "follow" }[] = [];
    for (const post of posts) {
      const published = post.status === undefined || post.status === "published";
      events.push({ userId: post.authorId, at: published ? (post.publishAt ?? post._creationTime) : post._creationTime, kind: published ? "post" : "draft" });
    }
    for (const comment of comments) events.push({ userId: comment.authorId, at: comment._creationTime, kind: "comment" });
    for (const follow of follows) events.push({ userId: follow.followerId, at: follow.createdAt, kind: "follow" });
    return events;
  },
});
