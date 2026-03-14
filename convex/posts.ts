import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { assertUserNotBanned, authComponent, isAdminUserRecord } from "./auth";
import { Doc, Id } from "./_generated/dataModel";
import { components, internal } from "./_generated/api";

const TOPIC_VALUES = [
  "Web Architecture",
  "UI Engineering",
  "AI for Developers",
  "Productivity",
] as const;
type Topic = (typeof TOPIC_VALUES)[number];

type BetterAuthUserContact = {
  email?: string | null;
};

// Utility function to generate URL-safe slug
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

// Utility function to check if slug is unique
async function getUniqueSlug(
  ctx: MutationCtx,
  baseSlug: string,
  excludeId?: Id<"posts">
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await ctx.db
      .query("posts")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (!existing || (excludeId && existing._id === excludeId)) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

function getAppUrl() {
  return (process.env.SITE_URL ?? "https://thewebroom.vercel.app").replace(/\/$/, "");
}

async function getPostAuthorEmail(ctx: MutationCtx, authorId: string) {
  const userById = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "user",
    where: [{ field: "_id", operator: "eq", value: authorId }],
  })) as BetterAuthUserContact | null;

  const emailById = userById?.email?.trim();
  if (emailById && emailById.length > 0) return emailById;

  // Fallback for older records where posts.authorId may reference legacy userId.
  const userByLegacyId = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "user",
    where: [{ field: "userId", operator: "eq", value: authorId }],
  })) as BetterAuthUserContact | null;

  const emailByLegacyId = userByLegacyId?.email?.trim();
  return emailByLegacyId && emailByLegacyId.length > 0 ? emailByLegacyId : null;
}

export const createPost = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    subtitle: v.string(),
    minRead: v.number(),
    contentHtml: v.optional(v.string()),
    topic: v.optional(
      v.union(
        v.literal("Web Architecture"),
        v.literal("UI Engineering"),
        v.literal("AI for Developers"),
        v.literal("Productivity")
      )
    ),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Get the authenticated user
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new ConvexError("User not found");
    }

    await assertUserNotBanned(ctx, { _id: user._id, email: user.email });

    // Check rate limit for post creation
    const rateLimit = await ctx.db
      .query("rateLimits")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    const now = Date.now();
    const POST_RATE_LIMIT = 2;
    const POST_WINDOW_MS = 24 * 60 * 60 * 1000;

    if (rateLimit) {
      const windowStart = rateLimit.postWindowStart || now;
      const timeSinceWindowStart = now - windowStart;

      // Reset window if 24 hours have passed
      if (timeSinceWindowStart <= POST_WINDOW_MS) {
        const currentCount = rateLimit.postCount || 0;
        if (currentCount >= POST_RATE_LIMIT) {
          const timeUntilReset = POST_WINDOW_MS - timeSinceWindowStart;
          throw new ConvexError(
            `You can only publish ${POST_RATE_LIMIT} posts per day. Please try again in ${Math.ceil(timeUntilReset / 60000)} minutes.`
          );
        }
      }
    }

    // Generate slug from title
    const baseSlug = generateSlug(args.title);
    const uniqueSlug = await getUniqueSlug(ctx, baseSlug);

    // user._id is the correct user ID from better-auth
    const blogArticle = await ctx.db.insert("posts", {
      body: args.body,
      subtitle: args.subtitle,
      title: args.title,
      slug: uniqueSlug,
      minRead: args.minRead,
      authorId: user._id,
      authorName: user.name || "",
      imageStorageId: args.imageStorageId,
      contentHtml: args.contentHtml,
      topic: (args.topic ?? "Web Architecture") as Topic,
      status: "published",
    });

    // Update rate limit
    if (rateLimit) {
      const windowStart = rateLimit.postWindowStart || now;
      const timeSinceWindowStart = now - windowStart;

      if (timeSinceWindowStart > POST_WINDOW_MS) {
        // Reset window
        await ctx.db.patch(rateLimit._id, {
          postWindowStart: now,
          postCount: 1,
        });
      } else {
        // Increment counter
        const currentCount = rateLimit.postCount || 0;
        await ctx.db.patch(rateLimit._id, {
          postCount: currentCount + 1,
        });
      }
    } else {
      // Create new rate limit entry
      await ctx.db.insert("rateLimits", {
        userId: user._id,
        postWindowStart: now,
        postCount: 1,
      });
    }

    return { id: blogArticle, slug: uniqueSlug };
  },
});

export const getPosts = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").order("desc").collect();

    return await Promise.all(
      posts.map(async (post) => {
        const resolvedImageUrl =
          post.imageStorageId !== undefined ? await ctx.storage.getUrl(post.imageStorageId) : null;

        return {
          ...post,
          imageUrl: resolvedImageUrl,
        };
      })
    );
  },
});

export const getPublishedPosts = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").order("desc").collect();

    // Filter to published-only in JS — no unsafe TypeScript cast needed.
    // A post is "published" if status is explicitly "published" OR
    // if the status field was never set (legacy posts before status existed).
    const publishedPosts = posts.filter((p) => p.status === "published" || p.status === undefined);

    return await Promise.all(
      publishedPosts.map(async (post) => {
        const resolvedImageUrl =
          post.imageStorageId !== undefined ? await ctx.storage.getUrl(post.imageStorageId) : null;
        return { ...post, imageUrl: resolvedImageUrl };
      })
    );
  },
});

export const generateImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const getPostById = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) return null;

    const resolvedImageUrl =
      post?.imageStorageId !== undefined ? await ctx.storage.getUrl(post.imageStorageId) : null;
    return {
      ...post,
      imageUrl: resolvedImageUrl,
    };
  },
});

export const getPostBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const post = await ctx.db
      .query("posts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!post) return null;

    const resolvedImageUrl =
      post.imageStorageId !== undefined ? await ctx.storage.getUrl(post.imageStorageId) : null;

    return { ...post, imageUrl: resolvedImageUrl };
  },
});

export const updatePost = mutation({
  args: {
    postId: v.id("posts"),
    title: v.optional(v.string()),
    body: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    minRead: v.optional(v.number()),
    contentHtml: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    topic: v.optional(
      v.union(
        v.literal("Web Architecture"),
        v.literal("UI Engineering"),
        v.literal("AI for Developers"),
        v.literal("Productivity")
      )
    ),
    status: v.optional(v.union(v.literal("published"), v.literal("hidden"), v.literal("flagged"))),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new ConvexError("Not authenticated");
    }

    await assertUserNotBanned(ctx, { _id: user._id, email: user.email });

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new ConvexError("Post not found");
    }

    const isAdmin = isAdminUserRecord(user);

    const isAuthor = post.authorId.toString() === user._id.toString();

    if (!isAdmin && !isAuthor) {
      throw new ConvexError("Not authorized to update this post");
    }

    const patch: Partial<Doc<"posts">> = {};
    // Inside updatePost handler, after the authorization check:
    if (args.title !== undefined) {
      patch.title = args.title;
      // Regenerate slug if title changes or post is missing one
      const newBaseSlug = generateSlug(args.title);
      patch.slug = await getUniqueSlug(ctx, newBaseSlug, args.postId);
    } else if (!post.slug) {
      // Backfill slug for old posts that never got one
      const baseSlug = generateSlug(post.title);
      patch.slug = await getUniqueSlug(ctx, baseSlug, args.postId);
    }
    if (args.body !== undefined) patch.body = args.body;
    if (args.subtitle !== undefined) patch.subtitle = args.subtitle;
    if (args.contentHtml !== undefined) patch.contentHtml = args.contentHtml;
    if (args.topic !== undefined) patch.topic = args.topic as Topic;
    if (args.status !== undefined) patch.status = args.status;
    if (args.minRead !== undefined) {
      patch.minRead = args.minRead;
    }
    if (args.imageStorageId !== undefined) {
      patch.imageStorageId = args.imageStorageId;
    }

    await ctx.db.patch(args.postId, patch);

    const nextStatus = args.status ?? post.status;
    const becameHidden = nextStatus === "hidden" && post.status !== "hidden";
    const becamePublished = nextStatus === "published" && post.status === "hidden";
    if (isAdmin && (becameHidden || becamePublished)) {
      const authorEmail = await getPostAuthorEmail(ctx, post.authorId);
      if (authorEmail) {
        const finalTitle = args.title ?? post.title;
        const finalSlug = patch.slug ?? post.slug;
        const slugPath = finalSlug ? `/posts/${finalSlug}` : "/profile";
        const postLink = `${getAppUrl()}${slugPath}`;
        const editPath = finalSlug ? `/edit/${finalSlug}` : "/profile";
        const editLink = `${getAppUrl()}${editPath}`;
        try {
          if (becameHidden) {
            await ctx.scheduler.runAfter(0, internal.emails.deliverPostHiddenModerationEmail, {
              name: post.authorName,
              email: authorEmail,
              postTitle: finalTitle,
              editLink,
            });
          } else {
            await ctx.scheduler.runAfter(
              0,
              (internal.emails as any).deliverPostPublishedModerationEmail,
              {
                name: post.authorName,
                email: authorEmail,
                postTitle: finalTitle,
                postLink,
              }
            );
          }
        } catch (error) {
          console.error(
            becameHidden ? "[Email][PostHidden][QueueError]" : "[Email][PostPublished][QueueError]",
            error
          );
        }
      } else {
        console.warn("[Email][Moderation][SkipNoAuthorEmail]", {
          postId: args.postId,
          authorId: post.authorId,
          statusBefore: post.status ?? "published",
          statusAfter: nextStatus ?? "published",
        });
      }
    }

    return { success: true };
  },
});

export const deletePost = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      throw new ConvexError("Not authenticated");
    }

    await assertUserNotBanned(ctx, { _id: user._id, email: user.email });

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new ConvexError("Post not found");
    }

    const isAdmin = isAdminUserRecord(user);
    const isAuthor = post.authorId.toString() === user._id.toString();

    if (!isAdmin && !isAuthor) {
      throw new ConvexError("Not authorized to delete this post");
    }

    if (isAdmin) {
      const authorEmail = await getPostAuthorEmail(ctx, post.authorId);
      if (authorEmail) {
        try {
          await ctx.scheduler.runAfter(0, internal.emails.deliverPostDeletedModerationEmail, {
            name: post.authorName,
            email: authorEmail,
            postTitle: post.title,
          });
        } catch (error) {
          console.error("[Email][PostDeleted][QueueError]", error);
        }
      } else {
        console.warn("[Email][PostDeleted][SkipNoAuthorEmail]", {
          postId: args.postId,
          authorId: post.authorId,
        });
      }
    }

    await ctx.db.delete(args.postId);

    return { success: true };
  },
});

interface searchResults {
  _id: string;
  title: string;
  subtitle: string;
  body: string;
}

export const searchPosts = query({
  args: {
    term: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const limit = args.limit;

    const results: searchResults[] = [];

    const seen = new Set();

    const pushDocs = async (docs: Array<Doc<"posts">>) => {
      for (const doc of docs) {
        if (seen.has(doc._id)) continue;

        seen.add(doc._id);

        results.push({
          _id: doc._id,
          title: doc.title,
          subtitle: doc.subtitle,
          body: doc.subtitle || doc.body,
        });
        if (results.length >= limit) break;
      }
    };

    const titleMatches = await ctx.db
      .query("posts")
      .withSearchIndex("search_title", (q) => q.search("title", args.term))
      .take(limit);

    await pushDocs(titleMatches);

    if (results.length < limit) {
      const bodyMatches = await ctx.db
        .query("posts")
        .withSearchIndex("search_body", (q) => q.search("body", args.term))
        .take(limit);

      await pushDocs(bodyMatches);
    }

    return results;
  },
});

export const getAllPostSlugs = query({
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").collect();
    return posts.map((p) => ({ slug: p.slug }));
  },
});
