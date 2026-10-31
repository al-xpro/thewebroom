import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { assertUserNotBanned, authComponent, isAdminUserRecord } from "./auth";
import { Doc, Id } from "./_generated/dataModel";
import { components, internal } from "./_generated/api";
import { topicValidator, type Topic } from "./topics";
import { announcePost } from "./notifications";
import { claimPostImage, createImageUploadUrl, deletePostImage } from "./uploads";


type BetterAuthUserContact = {
  email?: string | null;
};

type PostStatus = NonNullable<Doc<"posts">["status"]>;

// Legacy rows have no status and count as published.
function isPublished(post: Doc<"posts">) {
  return post.status === undefined || post.status === "published";
}

// Moderation states belong to admins: authors only move posts between draft and published.
function isModerationStatus(status: PostStatus | undefined) {
  return status === "hidden" || status === "flagged";
}

// A non-published post is visible only to its author and to admins.
async function canViewPost(ctx: QueryCtx, post: Doc<"posts">) {
  if (isPublished(post)) return true;
  const viewer = await authComponent.safeGetAuthUser(ctx);
  if (!viewer) return false;
  return post.authorId === viewer._id.toString() || isAdminUserRecord(viewer);
}

async function withImageUrl(ctx: QueryCtx, post: Doc<"posts">) {
  const imageUrl =
    post.imageStorageId !== undefined ? await ctx.storage.getUrl(post.imageStorageId) : null;
  return { ...post, imageUrl };
}

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
  return (process.env.SITE_URL ?? "https://thewebroom.alxpro.com").replace(/\/$/, "");
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
      topicValidator
    ),
    status: v.optional(
      v.union(v.literal("published"), v.literal("draft"), v.literal("hidden"), v.literal("flagged"))
    ),
    imageStorageId: v.optional(v.id("_storage")),
    aiAssisted: v.optional(v.boolean()),
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

    if (isModerationStatus(args.status) && !isAdminUserRecord(user)) {
      throw new ConvexError("Only moderators can hide or flag a post");
    }

    // Check rate limit for post creation (applies to both draft and publish on create page)
    const now = Date.now();
    const POST_RATE_LIMIT = 2;
    const POST_WINDOW_MS = 24 * 60 * 60 * 1000;

    const rateLimit = await ctx.db
      .query("rateLimits")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (rateLimit) {
      const windowStart = rateLimit.postWindowStart || now;
      const timeSinceWindowStart = now - windowStart;

      // Reset window if 24 hours have passed
      if (timeSinceWindowStart <= POST_WINDOW_MS) {
        const currentCount = rateLimit.postCount || 0;
        if (currentCount >= POST_RATE_LIMIT) {
          const timeUntilReset = POST_WINDOW_MS - timeSinceWindowStart;
          throw new ConvexError(
            `You can only create ${POST_RATE_LIMIT} posts per day (draft or published). Please try again in ${Math.ceil(timeUntilReset / 60000)} minutes.`
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
      status: args.status ?? "published",
      ...(args.aiAssisted ? { aiAssisted: true } : {}),
    });

    // Update rate limit (counts both draft and publish creations)
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

    await announcePost(ctx, blogArticle);

    if (args.imageStorageId) await claimPostImage(ctx, user._id, args.imageStorageId, blogArticle);

    return { id: blogArticle, slug: uniqueSlug };
  },
});

export const getMyPosts = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return [];

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_authorId", (q) => q.eq("authorId", user._id.toString()))
      .order("desc")
      .collect();

    return await Promise.all(posts.map((post) => withImageUrl(ctx, post)));
  },
});

export const getAllPostsForAdmin = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user || !isAdminUserRecord(user)) throw new ConvexError("Not authorized");

    const posts = await ctx.db.query("posts").order("desc").collect();
    return await Promise.all(posts.map((post) => withImageUrl(ctx, post)));
  },
});

export const getPublishedPosts = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").order("desc").collect();

    // Filter to published-only in JS — no unsafe TypeScript cast needed.
    // A post is "published" if status is explicitly "published" OR
    // if the status field was never set (legacy posts before status existed).
    // Newest first by the time they went out: a scheduled post publishes after its draft
    // was created (#60).
    const publishedPosts = posts
      .filter((p) => p.status === "published" || p.status === undefined)
      .sort((a, b) => (b.publishAt ?? b._creationTime) - (a.publishAt ?? a._creationTime));

    return await Promise.all(
      publishedPosts.map(async (post) => {
        const resolvedImageUrl =
          post.imageStorageId !== undefined ? await ctx.storage.getUrl(post.imageStorageId) : null;
        return { ...post, imageUrl: resolvedImageUrl };
      })
    );
  },
});

// For members allowed to post, with a per-hour limit; the file is checked afterwards by
// uploads.registerPostImage (#19).
export const generateImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => await createImageUploadUrl(ctx),
});

export const getPostBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const post = await ctx.db
      .query("posts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!post || !(await canViewPost(ctx, post))) return null;

    return await withImageUrl(ctx, post);
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
    // Clears the cover image (and deletes its file) when no new one is given.
    removeImage: v.optional(v.boolean()),
    topic: v.optional(
      topicValidator
    ),
    // Once a post is AI-assisted it stays so; this only turns it on.
    aiAssisted: v.optional(v.boolean()),
    status: v.optional(
      v.union(v.literal("published"), v.literal("draft"), v.literal("hidden"), v.literal("flagged"))
    ),
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

    if (!isAdmin && isModerationStatus(args.status)) {
      throw new ConvexError("Only moderators can hide or flag a post");
    }
    // An author may still edit a hidden or flagged post to fix it, but only an admin
    // republishes it, so the author's status change is ignored while it's under moderation.
    const status = !isAdmin && isModerationStatus(post.status) ? undefined : args.status;

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
    if (args.aiAssisted) patch.aiAssisted = true;
    if (args.topic !== undefined) patch.topic = args.topic as Topic;
    if (status !== undefined) patch.status = status;
    if (args.minRead !== undefined) {
      patch.minRead = args.minRead;
    }
    if (args.removeImage && args.imageStorageId === undefined && post.imageStorageId) {
      await deletePostImage(ctx, post.imageStorageId);
      patch.imageStorageId = undefined;
    }
    if (args.imageStorageId !== undefined && args.imageStorageId !== post.imageStorageId) {
      // Only the author's own uploads; the image it replaces is deleted.
      await claimPostImage(ctx, post.authorId, args.imageStorageId, post._id);
      if (post.imageStorageId) await deletePostImage(ctx, post.imageStorageId);
      patch.imageStorageId = args.imageStorageId;
    }

    await ctx.db.patch(args.postId, patch);

    const nextStatus = status ?? post.status;
    if (nextStatus === undefined || nextStatus === "published") await announcePost(ctx, post._id);
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
              internal.emails.deliverPostPublishedModerationEmail,
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

    return {
      success: true,
      slug: patch.slug ?? post.slug,
      status: patch.status ?? post.status ?? "published",
    };
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

    // Its cover image goes with it.
    if (post.imageStorageId) await deletePostImage(ctx, post.imageStorageId);

    // Only send moderation email if admin is deleting someone else's post, not their own
    const isDeletingOthersPost = isAdmin && post.authorId.toString() !== user._id.toString();
    if (isDeletingOthersPost) {
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

    // Its comments go with it, replies included.
    const postComments = await ctx.db
      .query("comments")
      .withIndex("by_postId", (q) => q.eq("postId", args.postId))
      .collect();
    for (const comment of postComments) await ctx.db.delete(comment._id);

    // Saved and "helpful" rows go with the post; its series closes the gap.
    for (const table of ["bookmarks", "reactions"] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_post", (q) => q.eq("postId", args.postId))
        .collect();
      for (const row of rows) await ctx.db.delete(row._id);
    }
    if (post.seriesId) {
      const seriesId = post.seriesId;
      const parts = await ctx.db
        .query("posts")
        .withIndex("by_series", (q) => q.eq("seriesId", seriesId))
        .collect();
      for (const [index, part] of parts.entries()) await ctx.db.patch(part._id, { seriesPart: index + 1 });
      if (parts.length === 0) await ctx.db.delete(seriesId);
    }

    return { success: true };
  },
});

export const getAllPostSlugs = query({
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").collect();
    return posts
      .filter((p) => p.status === "published" || p.status === undefined)
      .map((p) => ({ slug: p.slug }));
  },
});
