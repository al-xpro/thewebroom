import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertUserNotBanned, authComponent } from "./auth";
import { AGENT_LIMITS } from "./agentLimits";

// The writing assistant in the editor counts each request (a selection action or a
// review) against a daily allowance per member. The model is called from the Next.js
// server (app/assistant-actions.ts) only after this succeeds.

const DAY_MS = 24 * 60 * 60 * 1000;

export const remaining = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx).catch(() => null);
    if (!user) return null;
    const record = await ctx.db
      .query("rateLimits")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();
    const open = record?.assistantWindowStart !== undefined && Date.now() - record.assistantWindowStart < DAY_MS;
    return Math.max(0, AGENT_LIMITS.assistantPerDay - (open ? (record?.assistantCount ?? 0) : 0));
  },
});

export const consume = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    await assertUserNotBanned(ctx, user);
    const now = Date.now();
    const record = await ctx.db
      .query("rateLimits")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();
    const open = record?.assistantWindowStart !== undefined && now - record.assistantWindowStart < DAY_MS;
    const count = (open ? (record?.assistantCount ?? 0) : 0) + 1;
    if (count > AGENT_LIMITS.assistantPerDay) {
      throw new ConvexError(`The assistant helps ${AGENT_LIMITS.assistantPerDay} times a day. Try again tomorrow.`);
    }
    const update = { assistantWindowStart: open ? record!.assistantWindowStart : now, assistantCount: count };
    if (record) await ctx.db.patch(record._id, update);
    else await ctx.db.insert("rateLimits", { userId: user._id, ...update });
    return AGENT_LIMITS.assistantPerDay - count;
  },
});
