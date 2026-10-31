import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { assertUserNotBanned, authComponent } from "./auth";

// Post cover images (#19). The browser's checks aren't trusted: after an upload, the server
// reads the stored file's real type and size and deletes anything outside the limits; a
// post can only use an image its author uploaded; images never attached to a post are
// deleted after a day.

export const POST_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/tiff"];
export const POST_IMAGE_MAX_BYTES = 1024 * 1024;
const UPLOADS_PER_HOUR = 20;
const HOUR = 60 * 60 * 1000;
const ORPHAN_AFTER = 24 * HOUR;

// An upload URL, for members allowed to post, at most UPLOADS_PER_HOUR an hour.
export async function createImageUploadUrl(ctx: MutationCtx) {
  const user = await authComponent.getAuthUser(ctx);
  await assertUserNotBanned(ctx, user);

  const now = Date.now();
  const record = await ctx.db
    .query("rateLimits")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .first();
  const open = record?.uploadWindowStart !== undefined && now - record.uploadWindowStart < HOUR;
  const count = (open ? (record?.uploadCount ?? 0) : 0) + 1;
  if (count > UPLOADS_PER_HOUR) throw new ConvexError(`You can upload ${UPLOADS_PER_HOUR} images an hour.`);
  const update = { uploadWindowStart: open ? record!.uploadWindowStart : now, uploadCount: count };
  if (record) await ctx.db.patch(record._id, update);
  else await ctx.db.insert("rateLimits", { userId: user._id, ...update });

  return await ctx.storage.generateUploadUrl();
}

// Checks a file just uploaded and records who uploaded it; deletes it when it isn't an
// image within the limits.
export const registerPostImage = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const user = await authComponent.getAuthUser(ctx);
    await assertUserNotBanned(ctx, user);

    const existing = await ctx.db
      .query("uploads")
      .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
      .first();
    if (existing) {
      if (existing.userId !== user._id) throw new ConvexError("This file isn't yours");
      return;
    }

    const file = await ctx.db.system.get(storageId);
    if (!file) throw new ConvexError("Upload not found");
    const type = file.contentType ?? "";
    if (!POST_IMAGE_TYPES.includes(type) || file.size > POST_IMAGE_MAX_BYTES) {
      await ctx.storage.delete(storageId);
      throw new ConvexError("Use a JPEG, PNG, WebP, AVIF or TIFF image of 1 MB or less");
    }

    await ctx.db.insert("uploads", { storageId, userId: user._id, createdAt: Date.now() });
  },
});

// Lets a post use an image only if its author uploaded it (or it's already the post's).
export async function claimPostImage(
  ctx: MutationCtx,
  userId: string,
  storageId: Id<"_storage">,
  postId: Id<"posts">,
  currentImage?: Id<"_storage">
) {
  if (storageId === currentImage) return;
  const upload = await ctx.db
    .query("uploads")
    .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
    .first();
  if (!upload || upload.userId !== userId) throw new ConvexError("Use an image you uploaded");
  await ctx.db.patch(upload._id, { postId });
}

// Deletes a post's image file and its record.
export async function deletePostImage(ctx: MutationCtx, storageId: Id<"_storage">) {
  const upload = await ctx.db
    .query("uploads")
    .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
    .first();
  if (upload) await ctx.db.delete(upload._id);
  await ctx.storage.delete(storageId).catch(() => {});
}

// Daily: images uploaded more than a day ago and never attached to a post.
export const cleanupOrphanUploads = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - ORPHAN_AFTER;
    const old = await ctx.db
      .query("uploads")
      .withIndex("by_createdAt", (q) => q.lt("createdAt", cutoff))
      .take(200);
    let deleted = 0;
    for (const upload of old) {
      if (upload.postId) continue;
      await ctx.storage.delete(upload.storageId).catch(() => {});
      await ctx.db.delete(upload._id);
      deleted++;
    }
    return { deleted };
  },
});
