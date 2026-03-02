import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { buildWelcomeEmail, buildPasswordResetEmail } from "./emailTemplates";
import { sendEmail } from "./emailSender";

export const sendWelcomeEmail = mutation({
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

    console.log("[Email][Welcome]", {
      to: args.email,
      subject,
      body,
      html,
      provider: result.provider,
      delivered: result.delivered,
    });

    return { success: true, delivered: result.delivered };
  },
});

export const sendPasswordResetEmail = mutation({
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

    console.log("[Email][PasswordReset]", {
      to: args.email,
      subject,
      body,
      html,
      provider: result.provider,
      delivered: result.delivered,
    });

    return { success: true, delivered: result.delivered };
  },
});
