import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components, internal } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { betterAuth } from "better-auth";
import { ConvexError, v } from "convex/values";
import { verifyPassword } from "better-auth/crypto";
import { APIError } from "better-auth/api";
import authConfig from "./auth.config";
import { verifyClientIp } from "../lib/auth-proxy-signature";

const GITHUB_DELETE_REAUTH_CHALLENGE_TTL_MS = 10 * 60 * 1000;
const GITHUB_DELETE_REAUTH_GRANT_TTL_MS = 5 * 60 * 1000;
const DISPLAY_NAME_PATTERN = /^[a-zA-Z0-9\s-]+$/;
// Comma-separated lists, compared by exact match: a substring test would make any
// account whose e-mail or ID is contained in an admin's an admin too.
function parseEnvList(value: string | undefined, normalize: (item: string) => string) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => normalize(item.trim()))
      .filter(Boolean)
  );
}

const ADMIN_USER_IDS = parseEnvList(process.env.ADMIN_USER_ID, (id) => id);
const ADMIN_EMAILS = parseEnvList(process.env.ADMIN_EMAIL, (email) => email.toLowerCase());
function getAuthSiteUrl() {
  return process.env.SITE_URL;
}

function getSocialProviderCredentials() {
  const githubClientId = process.env.GITHUB_CLIENT_ID;
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

  return { githubClientId, githubClientSecret };
}

function sanitizeDisplayName(rawName: string) {
  const name = rawName.trim();
  if (name.length < 3) {
    throw new ConvexError("Name must be at least 3 characters");
  }
  if (name.length > 10) {
    throw new ConvexError("Name must be at most 10 characters");
  }
  if (!DISPLAY_NAME_PATTERN.test(name)) {
    throw new ConvexError("Name cannot contain special characters");
  }
  return name;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  return ADMIN_EMAILS.has(normalizeEmail(email));
}

function isAdminUserId(userId: string) {
  return ADMIN_USER_IDS.has(userId.trim());
}

export function isAdminUserRecord(user: { _id: string; email?: string | null }) {
  if (isAdminUserId(user._id.toString())) return true;
  return isAdminEmail(user.email);
}

async function getOnboardingCompletion(ctx: MutationCtx | QueryCtx, userId: string) {
  return await ctx.db
    .query("onboardingCompletions")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();
}

async function getActiveBanByEmail(ctx: MutationCtx | QueryCtx, email: string) {
  const normalizedEmail = normalizeEmail(email);
  const bans = await ctx.db
    .query("bannedUsers")
    .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
    .collect();
  return bans.find((ban) => ban.active) ?? null;
}

async function getActiveBanByUserId(ctx: MutationCtx | QueryCtx, userId: string) {
  const bans = await ctx.db
    .query("bannedUsers")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  return bans.find((ban) => ban.active) ?? null;
}

async function requireAdmin(ctx: MutationCtx | QueryCtx) {
  const user = await authComponent.getAuthUser(ctx);
  if (!isAdminUserRecord(user)) {
    throw new ConvexError("Not authorized");
  }
  return user;
}

export async function assertUserNotBanned(
  ctx: MutationCtx | QueryCtx,
  user: { _id: string; email: string }
) {
  const banByUserId = await getActiveBanByUserId(ctx, user._id);
  const banByEmail = await getActiveBanByEmail(ctx, user.email);
  const ban = banByUserId ?? banByEmail;
  if (!ban) return;

  throw new ConvexError(
    ban.reason
      ? `This account is banned: ${ban.reason}`
      : "This account has been permanently banned"
  );
}

export const authComponent = createClient<DataModel>(components.betterAuth);

const ACCOUNT_CREATION_WINDOW_MS = 24 * 60 * 60 * 1000;

// Runs inside the transaction that decides a sign-up: the ban check and the per-IP limit
// can't be skipped by calling better-auth directly, unlike checks made in the browser.
export const registerSignUp = internalMutation({
  args: { email: v.string(), ipAddress: v.string() },
  handler: async (ctx, args): Promise<{ allowed: true } | { allowed: false; message: string }> => {
    const email = normalizeEmail(args.email);

    if (await getActiveBanByEmail(ctx, email)) {
      return { allowed: false, message: "This e-mail address can't be used to create an account." };
    }

    const now = Date.now();
    const recent = await ctx.db
      .query("accountCreationLimits")
      .withIndex("by_ipAddress", (q) => q.eq("ipAddress", args.ipAddress))
      .collect();
    if (recent.some((creation) => creation.createdAt > now - ACCOUNT_CREATION_WINDOW_MS)) {
      return { allowed: false, message: "Too many accounts were created recently. Try again tomorrow." };
    }

    await ctx.db.insert("accountCreationLimits", {
      ipAddress: args.ipAddress,
      accountEmail: email,
      createdAt: now,
    });
    return { allowed: true };
  },
});

// Called by better-auth before it creates any user (e-mail or GitHub sign-up).
async function assertSignUpAllowed(
  ctx: GenericCtx<DataModel>,
  email: string,
  headers: Headers | undefined
) {
  const secret = process.env.AUTH_PROXY_SECRET;
  if (!secret) {
    console.error("[Auth][SignUp] AUTH_PROXY_SECRET is not set: refusing sign-ups.");
    throw new APIError("FORBIDDEN", { message: "Sign-ups are temporarily unavailable." });
  }

  // Only the website's auth route signs the client IP, so a missing or invalid signature
  // means the request bypassed it.
  const ipAddress = headers ? await verifyClientIp(secret, headers) : null;
  if (!ipAddress) {
    throw new APIError("FORBIDDEN", { message: "Sign up on the website." });
  }

  if (!("runMutation" in ctx)) {
    throw new APIError("FORBIDDEN", { message: "Sign up on the website." });
  }
  const result = await ctx.runMutation(internal.auth.registerSignUp, { email, ipAddress });
  if (!result.allowed) {
    throw new APIError("FORBIDDEN", { message: result.message });
  }
}

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false }
) => {
  const siteUrl = getAuthSiteUrl();
  const { githubClientId, githubClientSecret } = getSocialProviderCredentials();

  const socialProviders = {
    ...(githubClientId && githubClientSecret
      ? { github: { clientId: githubClientId, clientSecret: githubClientSecret } }
      : {}),
  };

  return betterAuth({
    logger: { disabled: optionsOnly },
    baseURL: siteUrl,
    // Other origins allowed to call auth, comma-separated, wildcards allowed. Set on the
    // dev deployment for Vercel previews: https://the-web-room-*-alxpro.vercel.app
    trustedOrigins: (process.env.TRUSTED_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    database: authComponent.adapter(ctx),
    emailAndPassword: { enabled: true, requireEmailVerification: true },
    socialProviders,
    plugins: [
      convex({
        authConfig,
        // Keys stored before 0.12 are EdDSA; 0.12 signs with RS256 and fails with
        // ERR_JOSE_NOT_SUPPORTED until they're replaced. This replaces them on the first
        // failed token request. Remove once production has rotated its keys.
        jwksRotateOnTokenGenerationError: true,
      }),
    ],
    databaseHooks: {
      user: {
        create: {
          before: async (user, context) => {
            await assertSignUpAllowed(ctx, user.email, context?.request?.headers ?? context?.headers);
          },
        },
      },
    },
  });
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    let user = null;
    try {
      user = await authComponent.safeGetAuthUser(ctx);
    } catch {
      return null;
    }
    if (!user) return null;

    const completion = await getOnboardingCompletion(ctx, user._id);
    const banByUserId = await getActiveBanByUserId(ctx, user._id);
    const banByEmail = await getActiveBanByEmail(ctx, user.email);
    const ban = banByUserId ?? banByEmail;
    return {
      ...user,
      onboardingCompleted: Boolean(completion),
      isBanned: Boolean(ban),
      banReason: ban?.reason ?? null,
    };
  },
});

export const getAuthProviderStatus = query({
  args: {},
  handler: async () => {
    const siteUrl = getAuthSiteUrl();
    const { githubClientId, githubClientSecret } = getSocialProviderCredentials();
    return {
      siteUrl,
      githubConfigured: Boolean(githubClientId && githubClientSecret),
    };
  },
});

export const getIsAdmin = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return false;
    return isAdminUserRecord(user);
  },
});

export const getBanStatusByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const ban = await getActiveBanByEmail(ctx, args.email);
    return {
      banned: Boolean(ban),
      reason: ban?.reason ?? null,
    };
  },
});

export const assertEmailNotBanned = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const ban = await getActiveBanByEmail(ctx, args.email.trim().toLowerCase());
    if (!ban) {
      return {
        allowed: true,
        banned: false,
        reason: null,
        message: null,
      };
    }

    const reason = ban.reason?.trim() || "Violation of platform policies";
    return {
      allowed: false,
      banned: true,
      reason,
      message: "Violation of platform policies",
    };
  },
});

export const listUsersForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      paginationOpts: { numItems: 500, cursor: null },
      sortBy: { field: "createdAt", direction: "desc" },
    });

    const users = Array.isArray(result)
      ? result
      : Array.isArray((result as { page?: unknown[] }).page)
        ? ((result as { page: unknown[] }).page as Array<Record<string, unknown>>)
        : [];

    const activeBans = await ctx.db
      .query("bannedUsers")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    const bansByEmail = new Map(activeBans.map((ban) => [ban.email, ban]));

    return users
      .filter((u) => typeof u.email === "string")
      .map((u) => {
        const email = normalizeEmail(String(u.email));
        const ban = bansByEmail.get(email) ?? null;
        const userId = String(u._id);
        return {
          _id: userId,
          email,
          name: typeof u.name === "string" ? u.name : "",
          createdAt: typeof u.createdAt === "number" ? u.createdAt : 0,
          isAdmin: isAdminUserRecord({ _id: userId, email }),
          isBanned: Boolean(ban),
          banReason: ban?.reason ?? null,
          bannedAt: ban?.bannedAt ?? null,
        };
      });
  },
});

export const banUserByAdmin = mutation({
  args: {
    email: v.string(),
    userId: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const email = normalizeEmail(args.email);

    if (isAdminEmail(email)) {
      throw new ConvexError("Cannot ban an admin account");
    }

    let targetUserId = args.userId?.trim() || undefined;
    let targetUser:
      | {
          _id?: unknown;
          email?: unknown;
        }
      | null
      | undefined;
    if (!targetUserId) {
      targetUser = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "user",
        where: [{ field: "email", operator: "eq", value: email }],
      });
      if (targetUser && typeof targetUser._id === "string") {
        targetUserId = targetUser._id;
      }
    }

    if (targetUserId && isAdminUserId(targetUserId)) {
      throw new ConvexError("Cannot ban an admin account");
    }
    if (targetUser && typeof targetUser.email === "string" && isAdminEmail(targetUser.email)) {
      throw new ConvexError("Cannot ban an admin account");
    }

    const existing = await ctx.db
      .query("bannedUsers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();

    for (const ban of existing) {
      await ctx.db.patch(ban._id, {
        active: true,
        reason: args.reason?.trim() || ban.reason,
        bannedAt: Date.now(),
        bannedByUserId: admin._id,
        userId: targetUserId ?? ban.userId,
      });
    }

    if (existing.length === 0) {
      await ctx.db.insert("bannedUsers", {
        email,
        userId: targetUserId,
        reason: args.reason?.trim() || undefined,
        active: true,
        bannedAt: Date.now(),
        bannedByUserId: admin._id,
      });
    }

    if (targetUserId) {
      await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
        input: {
          model: "session",
          where: [{ field: "userId" as const, value: targetUserId }],
        },
        paginationOpts: { numItems: 100, cursor: null },
      });
    }

    try {
      await ctx.scheduler.runAfter(0, internal.emails.deliverBannedUserEmail, {
        email,
        reason: args.reason?.trim() || undefined,
      });
    } catch (error) {
      console.error("[Email][Ban][QueueError]", error);
    }

    return { success: true };
  },
});

export const completeProfileOnboarding = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const name = sanitizeDisplayName(args.name);

    try {
      await ctx.runMutation(components.betterAuth.adapter.updateOne, {
        input: {
          model: "user",
          where: [{ field: "_id", operator: "eq", value: user._id }],
          update: {
            name,
            displayUsername: name,
            updatedAt: Date.now(),
          },
        },
      });
    } catch {
      // Some Better Auth configurations may not include `displayUsername`.
      await ctx.runMutation(components.betterAuth.adapter.updateOne, {
        input: {
          model: "user",
          where: [{ field: "_id", operator: "eq", value: user._id }],
          update: {
            name,
            updatedAt: Date.now(),
          },
        },
      });
    }

    const completion = await getOnboardingCompletion(ctx, user._id);
    if (completion) {
      await ctx.db.patch(completion._id, {
        displayName: name,
        completedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("onboardingCompletions", {
        userId: user._id,
        displayName: name,
        completedAt: Date.now(),
      });
    }

    // Welcome email is no longer sent here - users verify email first via /auth/verify-email
    // After profile completion, they can start creating posts

    return { success: true, name };
  },
});

type CredentialAccount = { _id: string; password?: string | null };
type GithubAccount = { _id: string; providerId: "github" };

async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function generateSecureToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function getCredentialAccount(ctx: MutationCtx | QueryCtx, userId: string) {
  return (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "account",
    where: [
      { field: "userId", operator: "eq", value: userId },
      { field: "providerId", operator: "eq", value: "credential" },
    ],
  })) as CredentialAccount | null;
}

async function getGithubAccount(ctx: MutationCtx | QueryCtx, userId: string) {
  return (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "account",
    where: [
      { field: "userId", operator: "eq", value: userId },
      { field: "providerId", operator: "eq", value: "github" },
    ],
  })) as GithubAccount | null;
}

async function getValidGithubDeleteReauthGrant(ctx: MutationCtx | QueryCtx, userId: string) {
  const now = Date.now();
  const grants = await ctx.db
    .query("deleteAccountReauthGrants")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  return grants.find((g) => g.provider === "github" && g.expiresAt > now) ?? null;
}

async function getCurrentSessionId(ctx: MutationCtx | QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.sessionId) return null;
  return String(identity.sessionId);
}

export const getDeleteAccountGuard = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      return {
        authenticated: false,
        hasCredentialPassword: false,
        requiresGithubReauth: false,
        githubReauthValid: false,
        githubReauthExpiresAt: null,
      };
    }

    const credentialAccount = await getCredentialAccount(ctx, user._id);
    const githubAccount = await getGithubAccount(ctx, user._id);
    const validGithubGrant = await getValidGithubDeleteReauthGrant(ctx, user._id);
    const hasCredentialPassword = Boolean(credentialAccount?.password);
    const requiresGithubReauth = !hasCredentialPassword && Boolean(githubAccount);

    return {
      authenticated: true,
      hasCredentialPassword,
      requiresGithubReauth,
      githubReauthValid: Boolean(validGithubGrant),
      githubReauthExpiresAt: validGithubGrant?.expiresAt ?? null,
    };
  },
});

async function assertDeleteAuthorization(ctx: MutationCtx, password: string | undefined) {
  const user = await authComponent.getAuthUser(ctx);
  const credentialAccount = await getCredentialAccount(ctx, user._id);
  const githubAccount = await getGithubAccount(ctx, user._id);

  if (credentialAccount?.password) {
    const providedPassword = password?.trim();
    if (!providedPassword) throw new ConvexError("Password is required to delete your account");

    const valid = await verifyPassword({
      hash: credentialAccount.password,
      password: providedPassword,
    });
    if (!valid) throw new ConvexError("Incorrect password");

    return { user, method: "password" as const };
  }

  if (githubAccount) {
    const validGrant = await getValidGithubDeleteReauthGrant(ctx, user._id);
    if (!validGrant)
      throw new ConvexError("GitHub reauthentication is required before deleting your account");
    return { user, method: "github_reauth" as const };
  }

  throw new ConvexError("No supported authentication method found for account deletion");
}

export const createGithubDeleteReauthChallenge = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    const sessionId = await getCurrentSessionId(ctx);
    if (!sessionId) throw new ConvexError("Unable to create reauthentication challenge");

    const credentialAccount = await getCredentialAccount(ctx, user._id);
    if (credentialAccount?.password) {
      throw new ConvexError(
        "This account already has a password. Use password verification instead."
      );
    }

    const githubAccount = await getGithubAccount(ctx, user._id);
    if (!githubAccount) throw new ConvexError("GitHub account not found");

    const existing = await ctx.db
      .query("deleteAccountReauthChallenges")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    for (const c of existing) await ctx.db.delete(c._id);

    const token = generateSecureToken(32);
    const tokenHash = await sha256Hex(token);

    await ctx.db.insert("deleteAccountReauthChallenges", {
      userId: user._id,
      provider: "github",
      tokenHash,
      sourceSessionId: sessionId,
      expiresAt: Date.now() + GITHUB_DELETE_REAUTH_CHALLENGE_TTL_MS,
    });

    return { token };
  },
});

export const completeGithubDeleteReauth = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const sessionId = await getCurrentSessionId(ctx);
    if (!sessionId) throw new ConvexError("Invalid authenticated session");

    const tokenHash = await sha256Hex(args.token.trim());
    const challenge = await ctx.db
      .query("deleteAccountReauthChallenges")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
      .first();

    if (!challenge || challenge.userId !== user._id || challenge.provider !== "github") {
      throw new ConvexError("Invalid or expired reauthentication challenge");
    }
    if (challenge.usedAt) throw new ConvexError("This reauthentication challenge was already used");
    if (Date.now() > challenge.expiresAt) {
      await ctx.db.delete(challenge._id);
      throw new ConvexError("Reauthentication challenge expired");
    }
    if (sessionId === challenge.sourceSessionId) {
      throw new ConvexError("GitHub reauthentication did not complete. Please try again.");
    }

    await ctx.db.patch(challenge._id, { usedAt: Date.now() });

    const existingGrants = await ctx.db
      .query("deleteAccountReauthGrants")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    for (const g of existingGrants) await ctx.db.delete(g._id);

    const expiresAt = Date.now() + GITHUB_DELETE_REAUTH_GRANT_TTL_MS;
    await ctx.db.insert("deleteAccountReauthGrants", {
      userId: user._id,
      provider: "github",
      expiresAt,
    });

    return { success: true, expiresAt };
  },
});

export const verifyDeletePassword = mutation({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    const result = await assertDeleteAuthorization(ctx, args.password);
    if (result.method !== "password") {
      throw new ConvexError("Password verification is not available for this account");
    }
    return { ok: true };
  },
});

export const checkDeletePassword = query({
  args: { password: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return { matches: false };

    const credentialAccount = await getCredentialAccount(ctx, user._id);
    if (!credentialAccount?.password) return { matches: false };

    const matches = await verifyPassword({
      hash: credentialAccount.password,
      password: args.password.trim(),
    });
    return { matches };
  },
});

export const sendVerificationEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; sent: boolean; error?: string }> => {
    const userEmail = normalizeEmail(args.email);
 
    const userRecord = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "email", operator: "eq", value: userEmail }],
    })) as { _id: string; email: string; emailVerified?: boolean } | null;
 
    // Unknown and already-verified addresses get the same answer, so the result doesn't
    // reveal which e-mails have a verified account. Sign-up calls this even for existing
    // accounts, because better-auth reports success for them too.
    if (!userRecord || userRecord.emailVerified) return { success: true, sent: false };
 
    const now = Date.now();
    const TTL_MS = 15 * 60 * 1000;
 
    // Clean up existing unused tokens for this user
    const existing = await ctx.db
      .query("emailVerificationTokens")
      .withIndex("by_userId", (q) => q.eq("userId", userRecord._id))
      .collect();
    for (const t of existing) await ctx.db.delete(t._id);
 
    // Generate cryptographically secure token — never store the raw value
    const rawToken = generateSecureToken(32); // crypto.getRandomValues based
    const tokenHash = await sha256Hex(rawToken);
 
    await ctx.db.insert("emailVerificationTokens", {
      userId: userRecord._id,
      tokenHash,           // only the hash is persisted
      email: userEmail,
      expiresAt: now + TTL_MS,
    });
 
    const verificationLink = `${
      process.env.SITE_URL ?? "http://localhost:3000"
    }/auth/verify-email?token=${rawToken}`; // raw token travels in the link
 
    try {
      await ctx.scheduler.runAfter(0, internal.emails.deliverEmailVerificationEmail, {
        email: userEmail,
        verificationLink,
      });
      return { success: true, sent: true };
    } catch (error) {
      console.error("[Email Verification] Send error:", error);
      return { success: true, sent: false, error: String(error) };
    }
  },
});
 
export const verifyEmail = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    // Hash the incoming token and look up by hash — never store raw tokens
    const tokenHash = await sha256Hex(args.token.trim());
 
    const tokenRecord = await ctx.db
      .query("emailVerificationTokens")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
      .first();
 
    if (!tokenRecord) {
      throw new ConvexError("Invalid verification link");
    }
 
    if (tokenRecord.expiresAt < Date.now()) {
      await ctx.db.delete(tokenRecord._id);
      throw new ConvexError("Verification link has expired. Please request a new one.");
    }
 
    if (tokenRecord.usedAt) {
      throw new ConvexError("This verification link has already been used.");
    }
 
    const user = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", operator: "eq", value: tokenRecord.userId }],
    })) as { _id: string; emailVerified?: boolean } | null;
 
    if (!user) throw new ConvexError("User not found");
 
    if (user.emailVerified) {
      await ctx.db.patch(tokenRecord._id, { usedAt: Date.now() });
      return { success: true, already: true };
    }
 
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", operator: "eq", value: tokenRecord.userId }],
        update: { emailVerified: true, updatedAt: Date.now() },
      },
    });
 
    await ctx.db.patch(tokenRecord._id, { usedAt: Date.now() });
 
    return { success: true, verified: true };
  },
});

export const deleteAccountCascade = mutation({
  args: { password: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user } = await assertDeleteAuthorization(ctx, args.password);

    // ── 1. Clean up app data ──────────────────────────────────────────────

    const challenges = await ctx.db
      .query("deleteAccountReauthChallenges")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    for (const c of challenges) await ctx.db.delete(c._id);

    const grants = await ctx.db
      .query("deleteAccountReauthGrants")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    for (const g of grants) await ctx.db.delete(g._id);

    const posts = await ctx.db
      .query("posts")
      .filter((q) => q.eq(q.field("authorId"), user._id))
      .collect();
    for (const post of posts) {
      const postComments = await ctx.db
        .query("comments")
        .filter((q) => q.eq(q.field("postId"), post._id))
        .collect();
      for (const c of postComments) await ctx.db.delete(c._id);
      await ctx.db.delete(post._id);
    }

    const comments = await ctx.db
      .query("comments")
      .filter((q) => q.eq(q.field("authorId"), user._id))
      .collect();
    for (const c of comments) await ctx.db.delete(c._id);

    const limits = await ctx.db
      .query("rateLimits")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();
    for (const l of limits) await ctx.db.delete(l._id);

    const presences = await ctx.db
      .query("presences")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();
    for (const p of presences) await ctx.db.delete(p._id);

    const onboardingCompletions = await ctx.db
      .query("onboardingCompletions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    for (const completion of onboardingCompletions) {
      await ctx.db.delete(completion._id);
    }

    // ── 2. Delete better-auth records ────────────────────────────────────
    // The adapter requires the `input` wrapper — that shape is correct.
    // The previous `as never` casts hid type errors in the `where` clause.
    // Removing the casts forces TypeScript to validate the where fields,
    // which surfaces any mismatches we need to fix explicitly.

    // deleteMany is a paginated bulk operation — paginationOpts is required.
    // numItems: 100 covers any realistic number of sessions/accounts per user.
    await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
      input: {
        model: "session",
        where: [{ field: "userId" as const, value: user._id }],
      },
      paginationOpts: { numItems: 100, cursor: null },
    });

    await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
      input: {
        model: "account",
        where: [{ field: "userId" as const, value: user._id }],
      },
      paginationOpts: { numItems: 100, cursor: null },
    });

    await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
      input: {
        model: "user",
        where: [{ field: "_id" as const, operator: "eq" as const, value: user._id }],
      },
    });

    return { success: true };
  },
});

// Real list of users in the home page

export const getRecentUsers = query({
  args: {},
  handler: async (ctx) => {
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      paginationOpts: { numItems: 4, cursor: null },
      sortBy: { field: "createdAt", direction: "desc" },
    });

    const users = Array.isArray(result)
      ? result
      : Array.isArray((result as { page?: unknown[] }).page)
        ? ((result as { page: unknown[] }).page as Array<Record<string, unknown>>)
        : [];

    return users
      .filter((u) => typeof u.email === "string")
      .map((u) => ({
        id: String(u._id),
        name: typeof u.name === "string" && u.name.trim() ? u.name : "Anonymous",
        imageUrl:
          typeof u.image === "string" && u.image.trim()
            ? u.image
            : `https://avatar.vercel.sh/${typeof u.name === "string" ? u.name : "user"}`,
      }));
  },
});