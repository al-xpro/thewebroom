import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalMutation, mutation, type QueryCtx } from "./_generated/server";
import { assertUserNotBanned, authComponent } from "./auth";

// Profile photos (#95). The upload goes through an action that receives the bytes, checks
// the real file type and size, and stores the file itself, so a member can only ever set a
// file this code stored for them, never someone else's.

const MAX_BYTES = 2 * 1024 * 1024;
const MIN_INTERVAL_MS = 30 * 1000;

// Identifies the format from the first bytes; the browser's declared type isn't trusted.
function sniffImageType(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | null {
  const starts = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

export const uploadAvatar = action({
  args: { bytes: v.bytes() },
  handler: async (ctx, { bytes }): Promise<{ avatarUrl: string | null }> => {
    const user = await authComponent.getAuthUser(ctx);
    if (bytes.byteLength > MAX_BYTES) throw new ConvexError("Use an image of 2 MB or less");
    const type = sniffImageType(new Uint8Array(bytes));
    if (!type) throw new ConvexError("Use a PNG, JPEG or WebP image");

    const storageId = await ctx.storage.store(new Blob([bytes], { type }));
    try {
      await ctx.runMutation(internal.avatars.setAvatar, {
        userId: user._id,
        email: user.email,
        storageId,
      });
    } catch (error) {
      await ctx.storage.delete(storageId);
      throw error;
    }
    return { avatarUrl: await ctx.storage.getUrl(storageId) };
  },
});

export const setAvatar = internalMutation({
  args: { userId: v.string(), email: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, { userId, email, storageId }) => {
    await assertUserNotBanned(ctx, { _id: userId, email });

    const existing = await ctx.db
      .query("avatars")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (existing && Date.now() - existing.updatedAt < MIN_INTERVAL_MS) {
      throw new ConvexError("You just changed your photo. Try again in a moment.");
    }

    if (existing) {
      await ctx.storage.delete(existing.storageId);
      await ctx.db.patch(existing._id, { storageId, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("avatars", { userId, storageId, updatedAt: Date.now() });
    }
  },
});

export const removeAvatar = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    const existing = await ctx.db
      .query("avatars")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();
    if (!existing) return;
    await ctx.storage.delete(existing.storageId);
    await ctx.db.delete(existing._id);
  },
});

// The uploaded photo's URL for each member who has one.
export async function getAvatarUrls(ctx: QueryCtx, userIds: string[]) {
  const urls = new Map<string, string>();
  for (const userId of new Set(userIds)) {
    const avatar = await ctx.db
      .query("avatars")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    const url = avatar && (await ctx.storage.getUrl(avatar.storageId as Id<"_storage">));
    if (url) urls.set(userId, url);
  }
  return urls;
}
