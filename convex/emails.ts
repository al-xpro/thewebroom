import { internal } from "./_generated/api";
import { internalAction, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  buildBannedUserEmail,
  buildPasswordResetEmail,
  buildPostDeletedWarningEmail,
  buildPostHiddenWarningEmail,
  buildPostPublishedNoticeEmail,
  buildEmailVerificationEmail,
} from "./emailTemplates";
import { sendEmail } from "./emailSender";

export const deliverEmailVerificationEmail = internalAction({
  args: {
    email: v.string(),
    verificationLink: v.string(),
  },
  handler: async (_ctx, args) => {
    const { subject, body, html } = buildEmailVerificationEmail({
      email: args.email,
      verificationLink: args.verificationLink,
    });

    const result = await sendEmail({
      to: args.email,
      subject,
      html,
      text: body,
    });

    console.log("[Email][EmailVerification][Delivery]", {
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

export const deliverBannedUserEmail = internalAction({
  args: {
    email: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const { subject, body, html } = buildBannedUserEmail({
      email: args.email,
      reason: args.reason,
    });

    const result = await sendEmail({
      to: args.email,
      subject,
      html,
      text: body,
    });

    console.log("[Email][Ban][Delivery]", {
      to: args.email,
      provider: result.provider,
      delivered: result.delivered,
    });

    return { success: true, delivered: result.delivered };
  },
});

export const deliverPostHiddenModerationEmail = internalAction({
  args: {
    name: v.string(),
    email: v.string(),
    postTitle: v.string(),
    editLink: v.string(),
  },
  handler: async (_ctx, args) => {
    const { subject, body, html } = buildPostHiddenWarningEmail({
      name: args.name,
      email: args.email,
      postTitle: args.postTitle,
      editLink: args.editLink,
    });

    const result = await sendEmail({
      to: args.email,
      subject,
      html,
      text: body,
    });

    console.log("[Email][PostHidden][Delivery]", {
      to: args.email,
      provider: result.provider,
      delivered: result.delivered,
    });

    return { success: true, delivered: result.delivered };
  },
});

export const deliverPostDeletedModerationEmail = internalAction({
  args: {
    name: v.string(),
    email: v.string(),
    postTitle: v.string(),
  },
  handler: async (_ctx, args) => {
    const { subject, body, html } = buildPostDeletedWarningEmail({
      name: args.name,
      email: args.email,
      postTitle: args.postTitle,
    });

    const result = await sendEmail({
      to: args.email,
      subject,
      html,
      text: body,
    });

    console.log("[Email][PostDeleted][Delivery]", {
      to: args.email,
      provider: result.provider,
      delivered: result.delivered,
    });

    return { success: true, delivered: result.delivered };
  },
});

export const deliverPostPublishedModerationEmail = internalAction({
  args: {
    name: v.string(),
    email: v.string(),
    postTitle: v.string(),
    postLink: v.string(),
  },
  handler: async (_ctx, args) => {
    const { subject, body, html } = buildPostPublishedNoticeEmail({
      name: args.name,
      email: args.email,
      postTitle: args.postTitle,
      postLink: args.postLink,
    });

    const result = await sendEmail({
      to: args.email,
      subject,
      html,
      text: body,
    });

    console.log("[Email][PostPublished][Delivery]", {
      to: args.email,
      provider: result.provider,
      delivered: result.delivered,
    });

    return { success: true, delivered: result.delivered };
  },
});

export const sendEmailVerificationEmail = mutation({
  args: {
    email: v.string(),
    verificationLink: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, internal.emails.deliverEmailVerificationEmail, {
      email: args.email,
      verificationLink: args.verificationLink,
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
