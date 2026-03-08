import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components, internal } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { betterAuth } from "better-auth";
import { ConvexError, v } from "convex/values";
import { verifyPassword } from "better-auth/crypto";

const GITHUB_DELETE_REAUTH_CHALLENGE_TTL_MS = 10 * 60 * 1000;
const GITHUB_DELETE_REAUTH_GRANT_TTL_MS = 5 * 60 * 1000;
const DISPLAY_NAME_PATTERN = /^[a-zA-Z0-9\s-]+$/;

function getAuthSiteUrl() {
  return (
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.CONVEX_SITE_URL ? `https://${process.env.CONVEX_SITE_URL}` : undefined) ??
    "http://localhost:3000"
  );
}

function getSocialProviderCredentials() {
  const githubClientId =
    process.env.GITHUB_CLIENT_ID ??
    process.env.AUTH_GITHUB_CLIENT_ID ??
    process.env.BETTER_AUTH_GITHUB_CLIENT_ID;
  const githubClientSecret =
    process.env.GITHUB_CLIENT_SECRET ??
    process.env.AUTH_GITHUB_CLIENT_SECRET ??
    process.env.BETTER_AUTH_GITHUB_CLIENT_SECRET;

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

async function getOnboardingCompletion(ctx: MutationCtx | QueryCtx, userId: string) {
  return await ctx.db
    .query("onboardingCompletions")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();
}

export const authComponent = createClient<DataModel>(components.betterAuth);

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
    database: authComponent.adapter(ctx),
    emailAndPassword: { enabled: true, requireEmailVerification: false },
    socialProviders,
    plugins: [convex()],
  });
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;

    const completion = await getOnboardingCompletion(ctx, user._id);
    return {
      ...user,
      onboardingCompleted: Boolean(completion),
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

    try {
      await ctx.scheduler.runAfter(0, internal.emails.deliverWelcomeEmail, {
        email: user.email,
        name,
      });
    } catch (error) {
      console.error("[Email][Welcome][QueueError]", error);
    }

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
