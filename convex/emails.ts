import { internal } from "./_generated/api";
import { internalAction, mutation } from "./_generated/server";
import { v } from "convex/values";
import { buildWelcomeEmail, buildPasswordResetEmail } from "./emailTemplates";
import { sendEmail } from "./emailSender";

export const deliverWelcomeEmail = internalAction({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const { subject, body, html } = buildWelcomeEmail({
      email: args.email,
      name: args.name ?? undefined,
    });

    const result = await sendEmail({
      to: args.email,
      subject,
      html,
      text: body,
    });

    console.log("[Email][Welcome][Delivery]", {
      to: args.email,
      provider: result.provider,
      delivered: result.delivered,
    });

    return { success: true, delivered: result.delivered };
  },
});

export const deliverPasswordResetEmail = internalAction({
  args: {
    email: v.string(),
    otp: v.string(),
    resetLink: v.string(),
  },
  handler: async (_ctx, args) => {
    const { subject, body, html } = buildPasswordResetEmail({
      email: args.email,
      otp: args.otp,
      resetLink: args.resetLink,
    });

    const result = await sendEmail({
      to: args.email,
      subject,
      html,
      text: body,
    });

    console.log("[Email][PasswordReset][Delivery]", {
      to: args.email,
      provider: result.provider,
      delivered: result.delivered,
    });

    return { success: true, delivered: result.delivered };
  },
});

export const sendWelcomeEmail = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, internal.emails.deliverWelcomeEmail, {
      email: args.email,
      name: args.name,
    });
    return { success: true, queued: true };
  },
});

export const sendPasswordResetEmail = mutation({
  args: {
    email: v.string(),
    otp: v.string(),
    resetLink: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, internal.emails.deliverPasswordResetEmail, {
      email: args.email,
      otp: args.otp,
      resetLink: args.resetLink,
    });
    return { success: true, queued: true };
  },
});
