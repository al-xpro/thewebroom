import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Adds an address to the newsletter. The answer is the same whether or not it was already
// there, so it doesn't reveal who subscribed.
export const subscribe = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (email.length > 254 || !EMAIL.test(email)) throw new ConvexError("Check the address");

    const existing = await ctx.db
      .query("newsletterSubscribers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!existing) await ctx.db.insert("newsletterSubscribers", { email, createdAt: Date.now() });
    return { ok: true };
  },
});
