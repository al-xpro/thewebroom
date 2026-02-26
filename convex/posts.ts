import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { Doc, Id } from "./_generated/dataModel";

const TOPIC_VALUES = ["Web Architecture", "UI Engineering", "AI for Developers", "Productivity"] as const;
type Topic = (typeof TOPIC_VALUES)[number];

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
async function getUniqueSlug(ctx: any, baseSlug: string, excludeId?: Id<"posts">): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await ctx.db
      .query("posts")
      .withIndex("by_slug", (q: any) => q.eq("slug", slug))
      .first();

    if (!existing || (excludeId && existing._id === excludeId)) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
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

    // Generate slug from title
    const baseSlug = generateSlug(args.title);
    const uniqueSlug = await getUniqueSlug(ctx, baseSlug);

    console.log(`[createPost] Generated slug "${uniqueSlug}" from title "${args.title}"`);
    console.log(`[createPost] minRead=${args.minRead} minutes`);

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
    const posts = await ctx.db
      .query("posts")
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "published"),
          q.eq(q.field("status"), undefined as unknown as string)
        )
      )
      .order("desc")
      .collect();

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
      .withIndex("by_slug", (q: any) => q.eq("slug", args.slug))
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

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new ConvexError("Post not found");
    }

    const isAdmin = process.env.NEXT_PUBLIC_ADMIN_ID
      ? user._id.toString() === process.env.NEXT_PUBLIC_ADMIN_ID
      : false;

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
      console.log(`[updatePost] Updating minRead: ${post.minRead} → ${args.minRead}`);
      patch.minRead = args.minRead;
    }
    if (args.imageStorageId !== undefined) {
      console.log(
        `[updatePost] Updating image: ${post.imageStorageId || "none"} → ${args.imageStorageId}`
      );
      patch.imageStorageId = args.imageStorageId;
    }

    await ctx.db.patch(args.postId, patch);

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

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new ConvexError("Post not found");
    }

    const isAdmin = process.env.NEXT_PUBLIC_ADMIN_ID
      ? user._id.toString() === process.env.NEXT_PUBLIC_ADMIN_ID
      : false;
    const isAuthor = post.authorId.toString() === user._id.toString();

    if (!isAdmin && !isAuthor) {
      throw new ConvexError("Not authorized to delete this post");
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
