import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { assertUserNotBanned, authComponent } from "./auth";
import { TOPICS, isTopic, topicValidator, type Topic } from "./topics";

const FOLLOW_CHANGE_LIMIT = 30;
const FOLLOW_WINDOW_MS = 60 * 60 * 1000;

async function requireMember(ctx: MutationCtx) {
  const user = await authComponent.getAuthUser(ctx);
  await assertUserNotBanned(ctx, user);
  return user;
}

// Each follow or unfollow counts; a member gets FOLLOW_CHANGE_LIMIT per hour.
async function countFollowChange(ctx: MutationCtx, userId: string, changes = 1) {
  const now = Date.now();
  const record = await ctx.db
    .query("rateLimits")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();

  const windowOpen = record?.followWindowStart && now - record.followWindowStart < FOLLOW_WINDOW_MS;
  const count = (windowOpen ? (record.followCount ?? 0) : 0) + changes;
  if (count > FOLLOW_CHANGE_LIMIT) {
    throw new ConvexError("Too many follow changes. Try again in an hour.");
  }

  const update = {
    followWindowStart: windowOpen ? record.followWindowStart : now,
    followCount: count,
  };
  if (record) await ctx.db.patch(record._id, update);
  else await ctx.db.insert("rateLimits", { userId, ...update });
}

async function topicFollows(ctx: MutationCtx, userId: string) {
  return await ctx.db
    .query("follows")
    .withIndex("by_follower", (q) => q.eq("followerId", userId).eq("targetType", "topic"))
    .collect();
}

// The topics the signed-in member follows; empty when signed out.
export const myFollowedTopics = query({
  args: {},
  handler: async (ctx): Promise<Topic[]> => {
    const user = await authComponent.safeGetAuthUser(ctx).catch(() => null);
    if (!user) return [];
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", user._id).eq("targetType", "topic"))
      .collect();
    return follows.map((follow) => follow.targetId).filter(isTopic);
  },
});

export const followTopic = mutation({
  args: { topic: topicValidator },
  handler: async (ctx, { topic }) => {
    const user = await requireMember(ctx);
    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) =>
        q.eq("followerId", user._id).eq("targetType", "topic").eq("targetId", topic)
      )
      .first();
    if (existing) return;

    await countFollowChange(ctx, user._id);
    await ctx.db.insert("follows", {
      followerId: user._id,
      targetType: "topic",
      targetId: topic,
      createdAt: Date.now(),
    });
  },
});

export const unfollowTopic = mutation({
  args: { topic: topicValidator },
  handler: async (ctx, { topic }) => {
    const user = await requireMember(ctx);
    const existing = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) =>
        q.eq("followerId", user._id).eq("targetType", "topic").eq("targetId", topic)
      )
      .first();
    if (!existing) return;

    await countFollowChange(ctx, user._id);
    await ctx.db.delete(existing._id);
  },
});

// Replaces the member's followed topics (onboarding and the profile page).
export const setFollowedTopics = mutation({
  args: { topics: v.array(topicValidator) },
  handler: async (ctx, args) => {
    const user = await requireMember(ctx);
    const wanted = new Set(args.topics);
    const current = await topicFollows(ctx, user._id);
    const currentTopics = new Set(current.map((follow) => follow.targetId));

    const removed = current.filter((follow) => !wanted.has(follow.targetId as Topic));
    const added = TOPICS.filter((topic) => wanted.has(topic) && !currentTopics.has(topic));
    if (removed.length + added.length === 0) return;

    await countFollowChange(ctx, user._id, removed.length + added.length);
    for (const follow of removed) await ctx.db.delete(follow._id);
    for (const topic of added) {
      await ctx.db.insert("follows", {
        followerId: user._id,
        targetType: "topic",
        targetId: topic,
        createdAt: Date.now(),
      });
    }
  },
});
