import { ConvexError, v } from "convex/values";
import { httpAction, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { authComponent, isAdminUserRecord } from "./auth";
import { api } from "./_generated/api";

async function requireAdmin(ctx: MutationCtx | QueryCtx) {
  const user = await authComponent.getAuthUser(ctx as MutationCtx);
  if (!isAdminUserRecord(user)) throw new ConvexError("Not authorized");
  return user;
}

export const banIp = mutation({
  args: {
    ipAddress: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const ip = args.ipAddress.trim();

    const existing = await ctx.db
      .query("bannedIps")
      .withIndex("by_ipAddress", (q) => q.eq("ipAddress", ip))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        active: true,
        reason: args.reason?.trim() ?? existing.reason,
        bannedAt: Date.now(),
        bannedByUserId: admin._id,
      });
    } else {
      await ctx.db.insert("bannedIps", {
        ipAddress: ip,
        reason: args.reason?.trim(),
        active: true,
        bannedAt: Date.now(),
        bannedByUserId: admin._id,
      });
    }

    return { success: true };
  },
});

export const unbanIp = mutation({
  args: { ipAddress: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const ip = args.ipAddress.trim();

    const existing = await ctx.db
      .query("bannedIps")
      .withIndex("by_ipAddress", (q) => q.eq("ipAddress", ip))
      .first();

    if (existing) await ctx.db.patch(existing._id, { active: false });

    return { success: true };
  },
});

export const listBannedIps = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const bans = await ctx.db.query("bannedIps").collect();
    return bans.filter((b) => b.active);
  },
});

export const isIpBanned = query({
  args: { ipAddress: v.string() },
  handler: async (ctx, args) => {
    const ban = await ctx.db
      .query("bannedIps")
      .withIndex("by_ipAddress", (q) => q.eq("ipAddress", args.ipAddress.trim()))
      .first();
    return Boolean(ban?.active);
  },
});

export const isIpBannedHttp = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const ip = url.searchParams.get("ip")?.trim() ?? "";

  if (!ip) {
    return new Response(JSON.stringify({ banned: false }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const banned = await ctx.runQuery(api.ipBans.isIpBanned, { ipAddress: ip });

  return new Response(JSON.stringify({ banned }), {
    headers: { "Content-Type": "application/json" },
  });
});
