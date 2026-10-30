import { v } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { authComponent } from "./auth";
import { getAvatarUrls } from "./avatars";
import { findMember } from "./follows";
import { TOPICS } from "./topics";

// Who writes here and what's happening: real members, posts and comments.

function isPublished(post: Doc<"posts">) {
  return post.status === undefined || post.status === "published";
}

function publishedAt(post: Doc<"posts">) {
  return post.publishAt ?? post._creationTime;
}

async function avatarsFor(ctx: QueryCtx, userIds: string[]) {
  const uploaded = await getAvatarUrls(ctx, userIds);
  const result = new Map<string, string | null>();
  for (const id of new Set(userIds)) {
    if (uploaded.has(id)) {
      result.set(id, uploaded.get(id)!);
      continue;
    }
    const member = await findMember(ctx, id);
    result.set(id, member?.image ?? null);
  }
  return result;
}

export const overview = query({
  args: {},
  handler: async (ctx) => {
    const posts = (await ctx.db.query("posts").order("desc").collect()).filter(
      (post) => isPublished(post) && post.slug
    );

    const writers = new Map<string, { id: string; name: string; posts: number; lastPostAt: number; topics: Set<string> }>();
    for (const post of posts) {
      const writer = writers.get(post.authorId) ?? {
        id: post.authorId,
        name: post.authorName || "Member",
        posts: 0,
        lastPostAt: 0,
        topics: new Set<string>(),
      };
      writer.posts += 1;
      writer.lastPostAt = Math.max(writer.lastPostAt, publishedAt(post));
      writer.topics.add(post.topic);
      writers.set(post.authorId, writer);
    }
    const sortedWriters = [...writers.values()].sort((a, b) => b.lastPostAt - a.lastPostAt).slice(0, 48);
    const avatars = await avatarsFor(ctx, sortedWriters.map((writer) => writer.id));

    const comments = (await ctx.db.query("comments").order("desc").take(30)).filter(
      (comment) => comment.status !== "hidden"
    );
    const postsById = new Map(posts.map((post) => [post._id as string, post]));
    const lately = [
      ...posts.slice(0, 12).map((post) => ({
        kind: "post" as const,
        actorId: post.authorId,
        actorName: post.authorName || "Member",
        postSlug: post.slug!,
        postTitle: post.title,
        at: publishedAt(post),
      })),
      ...comments.flatMap((comment) => {
        const post = postsById.get(comment.postId);
        if (!post) return [];
        return [
          {
            kind: "comment" as const,
            actorId: comment.authorId,
            actorName: comment.authorName || "Member",
            postSlug: post.slug!,
            postTitle: post.title,
            at: comment._creationTime,
          },
        ];
      }),
    ]
      .sort((a, b) => b.at - a.at)
      .slice(0, 12);

    return {
      totals: { writers: writers.size, posts: posts.length },
      writers: sortedWriters.map((writer) => ({
        id: writer.id,
        name: writer.name,
        posts: writer.posts,
        lastPostAt: writer.lastPostAt,
        topics: [...writer.topics],
        avatarUrl: avatars.get(writer.id) ?? null,
      })),
      topics: TOPICS.map((topic) => ({ topic, posts: posts.filter((post) => post.topic === topic).length })),
      lately,
    };
  },
});

// A member's public page: their name, photo and published posts. Follower counts stay
// private: only the member sees theirs.
export const member = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const record = await findMember(ctx, userId);
    if (!record) return null;
    const viewer = await authComponent.safeGetAuthUser(ctx).catch(() => null);
    const isSelf = viewer?._id === userId;

    const posts = (
      await ctx.db
        .query("posts")
        .withIndex("by_authorId", (q) => q.eq("authorId", userId))
        .collect()
    )
      .filter((post) => isPublished(post) && post.slug)
      .sort((a, b) => publishedAt(b) - publishedAt(a));

    const avatar = (await avatarsFor(ctx, [userId])).get(userId) ?? null;
    const followers = isSelf
      ? (
          await ctx.db
            .query("follows")
            .withIndex("by_target", (q) => q.eq("targetType", "user").eq("targetId", userId))
            .collect()
        ).length
      : null;

    return {
      id: userId,
      name: record.name?.trim() || posts[0]?.authorName || "Member",
      avatarUrl: avatar,
      isSelf,
      followers,
      posts: posts.map((post) => ({
        id: post._id,
        slug: post.slug!,
        title: post.title,
        subtitle: post.subtitle,
        topic: post.topic,
        minRead: post.minRead ?? 1,
        publishedAt: publishedAt(post),
      })),
    };
  },
});
