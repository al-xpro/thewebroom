import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { buildPasswordResetEmail } from "./emailTemplates";
import { components } from "./_generated/api";
import { hashPassword } from "better-auth/crypto";
import { sendEmail } from "./emailSender";

const OTP_TTL_MS = 15 * 60 * 1000;
const RESET_SESSION_TTL_MS = 15 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

const appUrl = (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
);

type BetterAuthUser = {
  _id: string;
  email: string;
};

type BetterAuthAccount = {
  _id: string;
  userId: string;
  providerId: string;
  password?: string | null;
};

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateSecureToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function getStoredOtpHash(otpRecord: { otpHash?: string; otp?: string }) {
  if (otpRecord.otpHash) return otpRecord.otpHash;
  if (otpRecord.otp) return sha256Hex(otpRecord.otp);
  return null;
}

async function findUserByEmail(
  ctx: MutationCtx | QueryCtx,
  email: string
): Promise<BetterAuthUser | null> {
  return (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "user",
    where: [{ field: "email", operator: "eq", value: email }],
  })) as BetterAuthUser | null;
}

async function getLatestOtpRecord(ctx: MutationCtx | QueryCtx, email: string) {
  const records = await ctx.db
    .query("passwordResetOtps")
    .withIndex("by_email", (q) => q.eq("email", email))
    .collect();

  return records.reduce<(typeof records)[number] | null>((latest, current) => {
    if (!latest) return current;
    return current.expiresAt > latest.expiresAt ? current : latest;
  }, null);
}

export const requestPasswordReset = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const email = args.email.trim().toLowerCase();

    const existingOtps = await ctx.db
      .query("passwordResetOtps")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();

    const latestOtp = existingOtps.reduce<(typeof existingOtps)[number] | null>(
      (latest, current) => {
        if (!latest) return current;
        return current.expiresAt > latest.expiresAt ? current : latest;
      },
      null
    );

    if (latestOtp) {
      const issuedAt = latestOtp.sentAt ?? latestOtp.expiresAt - OTP_TTL_MS;
      const cooldownMsRemaining = OTP_RESEND_COOLDOWN_MS - (now - issuedAt);
      if (cooldownMsRemaining > 0) {
        return {
          success: true,
          delivered: false,
          cooldownMsRemaining,
          rateLimited: true,
        };
      }
    }

    for (const otpRecord of existingOtps) {
      await ctx.db.delete(otpRecord._id);
    }

    const existingSessions = await ctx.db
      .query("passwordResetSessions")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();

    for (const session of existingSessions) {
      await ctx.db.delete(session._id);
    }

    const user = await findUserByEmail(ctx, email);

    // Prevent account enumeration by returning success regardless.
    if (!user) {
      return { success: true, delivered: false, cooldownMsRemaining: 0, rateLimited: false };
    }

    const otp = generateOtp();
    const otpHash = await sha256Hex(otp);
    const expiresAt = now + OTP_TTL_MS;

    await ctx.db.insert("passwordResetOtps", {
      email,
      otpHash,
      expiresAt,
      attempts: 0,
      sentAt: now,
    });

    const resetLink = `${appUrl}/auth/forgot-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`;

    const { subject, body, html } = buildPasswordResetEmail({ email, otp, resetLink });
    let sendResult: { delivered: boolean; provider: "resend" | "log" } = {
      delivered: false,
      provider: "log",
    };
    try {
      sendResult = await sendEmail({
        to: email,
        subject,
        html,
        text: body,
      });
    } catch (error) {
      console.error("[Email][PasswordReset][SendError]", error);
    }
    console.log("[Email][PasswordReset][OTP]", {
      to: email,
      subject,
      body,
      html,
      provider: sendResult.provider,
      delivered: sendResult.delivered,
    });

    return {
      success: true,
      delivered: sendResult.delivered,
      cooldownMsRemaining: OTP_RESEND_COOLDOWN_MS,
      rateLimited: false,
    };
  },
});

export const verifyOTP = query({
  args: { email: v.string(), otp: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const otp = args.otp.trim();

    const otpRecord = await getLatestOtpRecord(ctx, email);

    if (!otpRecord) {
      return { valid: false, error: "Invalid code" };
    }

    if (Date.now() > otpRecord.expiresAt) {
      return { valid: false, error: "Code expired" };
    }

    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      return { valid: false, error: "Too many attempts" };
    }

    const expectedOtpHash = await getStoredOtpHash(otpRecord);
    if (!expectedOtpHash) {
      return { valid: false, error: "Invalid code" };
    }

    const hashedOtp = await sha256Hex(otp);
    if (!constantTimeEqual(hashedOtp, expectedOtpHash)) {
      return { valid: false, error: "Invalid code" };
    }

    return { valid: true };
  },
});

export const verifyOTPAndCreateSession = mutation({
  args: { email: v.string(), otp: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const otp = args.otp.trim();

    const otpRecord = await getLatestOtpRecord(ctx, email);

    if (!otpRecord) {
      throw new ConvexError("Invalid or expired code");
    }

    if (Date.now() > otpRecord.expiresAt) {
      await ctx.db.delete(otpRecord._id);
      throw new ConvexError("Code expired");
    }

    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      throw new ConvexError("Too many attempts. Request a new code.");
    }

    const expectedOtpHash = await getStoredOtpHash(otpRecord);
    if (!expectedOtpHash) {
      throw new ConvexError("Invalid code");
    }

    const hashedOtp = await sha256Hex(otp);
    if (!constantTimeEqual(hashedOtp, expectedOtpHash)) {
      await ctx.db.patch(otpRecord._id, { attempts: otpRecord.attempts + 1 });
      throw new ConvexError("Invalid code");
    }

    await ctx.db.delete(otpRecord._id);

    const existingSessions = await ctx.db
      .query("passwordResetSessions")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();

    for (const session of existingSessions) {
      await ctx.db.delete(session._id);
    }

    const resetToken = generateSecureToken(32);
    const tokenHash = await sha256Hex(resetToken);

    await ctx.db.insert("passwordResetSessions", {
      email,
      tokenHash,
      expiresAt: Date.now() + RESET_SESSION_TTL_MS,
    });

    return { success: true, resetToken };
  },
});

export const validateResetSession = query({
  args: { resetToken: v.string() },
  handler: async (ctx, args) => {
    const tokenHash = await sha256Hex(args.resetToken.trim());

    const session = await ctx.db
      .query("passwordResetSessions")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
      .first();

    if (!session) {
      return { valid: false };
    }

    if (Date.now() > session.expiresAt) {
      return { valid: false };
    }

    return { valid: true };
  },
});

export const resetPassword = mutation({
  args: { resetToken: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    const resetToken = args.resetToken.trim();
    const tokenHash = await sha256Hex(resetToken);

    const session = await ctx.db
      .query("passwordResetSessions")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
      .first();

    if (!session) {
      throw new ConvexError("Invalid or expired reset session");
    }

    if (Date.now() > session.expiresAt) {
      await ctx.db.delete(session._id);
      throw new ConvexError("Reset session expired");
    }

    const user = await findUserByEmail(ctx, session.email);
    if (!user) {
      await ctx.db.delete(session._id);
      throw new ConvexError("Unable to reset password for this account");
    }

    const passwordHash = await hashPassword(args.newPassword);

    const credentialAccount = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "account",
      where: [
        { field: "userId", operator: "eq", value: user._id },
        { field: "providerId", operator: "eq", value: "credential" },
      ],
    })) as BetterAuthAccount | null;

    if (credentialAccount) {
      await ctx.runMutation(components.betterAuth.adapter.updateOne, {
        input: {
          model: "account",
          where: [{ field: "_id", operator: "eq", value: credentialAccount._id }],
          update: {
            password: passwordHash,
            updatedAt: Date.now(),
          },
        },
      });
    } else {
      await ctx.runMutation(components.betterAuth.adapter.create, {
        input: {
          model: "account",
          data: {
            accountId: user._id,
            providerId: "credential",
            userId: user._id,
            password: passwordHash,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
      });
    }

    await ctx.runMutation(
      components.betterAuth.adapter.deleteMany as never,
      {
        input: {
          model: "session",
          where: [{ field: "userId", operator: "eq", value: user._id }],
        },
      } as never
    );

    await ctx.db.delete(session._id);

    return { success: true };
  },
});
