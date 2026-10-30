import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { components } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { getAvatarUrls } from "./avatars";
import { notify } from "./notifications";
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

// ---- People (#28) ----

type MemberRecord = { _id: string; name?: string | null; image?: string | null };

export async function findMember(ctx: QueryCtx | MutationCtx, userId: string) {
  return (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "user",
    where: [{ field: "_id", operator: "eq", value: userId }],
  })) as MemberRecord | null;
}

async function userFollow(ctx: QueryCtx | MutationCtx, followerId: string, userId: string) {
  return await ctx.db
    .query("follows")
    .withIndex("by_follower", (q) =>
      q.eq("followerId", followerId).eq("targetType", "user").eq("targetId", userId)
    )
    .first();
}

export const isFollowingUser = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const user = await authComponent.safeGetAuthUser(ctx).catch(() => null);
    if (!user) return false;
    return Boolean(await userFollow(ctx, user._id, userId));
  },
});

export const followUser = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const user = await requireMember(ctx);
    if (userId === user._id) throw new ConvexError("You can't follow yourself.");
    if (!(await findMember(ctx, userId))) throw new ConvexError("Member not found");
    if (await userFollow(ctx, user._id, userId)) return;

    await countFollowChange(ctx, user._id);
    await ctx.db.insert("follows", {
      followerId: user._id,
      targetType: "user",
      targetId: userId,
      createdAt: Date.now(),
    });
    await notify(ctx, { userId, kind: "follower", actorId: user._id, actorName: user.name || "" });
  },
});

export const unfollowUser = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const user = await requireMember(ctx);
    const existing = await userFollow(ctx, user._id, userId);
    if (!existing) return;
    await countFollowChange(ctx, user._id);
    await ctx.db.delete(existing._id);
  },
});

function isPublished(post: Doc<"posts">) {
  return post.status === undefined || post.status === "published";
}

// The signed-in member's Following page: the people and topics they follow, and the
// newest posts from both.
export const following = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx).catch(() => null);
    if (!user) return null;

    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", user._id))
      .collect();
    const topics = follows.filter((f) => f.targetType === "topic").map((f) => f.targetId).filter(isTopic);
    const userIds = follows.filter((f) => f.targetType === "user").map((f) => f.targetId);

    const avatars = await getAvatarUrls(ctx, userIds);
    const people = [];
    for (const id of userIds) {
      const member = await findMember(ctx, id);
      if (!member) continue;
      const posts = await ctx.db
        .query("posts")
        .withIndex("by_authorId", (q) => q.eq("authorId", id))
        .collect();
      people.push({
        id,
        name: member.name?.trim() || "Member",
        avatarUrl: avatars.get(id) ?? member.image ?? null,
        posts: posts.filter(isPublished).length,
      });
    }

    const fromPeople = (
      await Promise.all(
        userIds.map((id) =>
          ctx.db
            .query("posts")
            .withIndex("by_authorId", (q) => q.eq("authorId", id))
            .order("desc")
            .take(20)
        )
      )
    ).flat();
    const fromTopics =
      topics.length > 0
        ? (await ctx.db.query("posts").order("desc").take(300)).filter((post) => topics.includes(post.topic))
        : [];

    const seen = new Set<string>();
    const feed = [...fromPeople, ...fromTopics]
      .filter((post) => isPublished(post) && post.slug && post.authorId !== user._id)
      .filter((post) => (seen.has(post._id) ? false : (seen.add(post._id), true)))
      .sort((a, b) => (b.publishAt ?? b._creationTime) - (a.publishAt ?? a._creationTime))
      .slice(0, 30)
      .map((post) => ({
        id: post._id,
        slug: post.slug!,
        title: post.title,
        subtitle: post.subtitle,
        topic: post.topic,
        minRead: post.minRead ?? 1,
        authorId: post.authorId,
        authorName: post.authorName,
        publishedAt: post.publishAt ?? post._creationTime,
        because: userIds.includes(post.authorId) ? ("person" as const) : ("topic" as const),
      }));

    return { topics, people, feed };
  },
});
