import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { betterAuth } from "better-auth";
import { ConvexError, v } from "convex/values";
import { verifyPassword } from "better-auth/crypto";

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

  return {
    githubClientId,
    githubClientSecret,
  };
}

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false }
) => {
  const siteUrl = getAuthSiteUrl();
  const { githubClientId, githubClientSecret } =
    getSocialProviderCredentials();

  const socialProviders = {
    ...(githubClientId && githubClientSecret
      ? {
          github: {
            clientId: githubClientId,
            clientSecret: githubClientSecret,
          },
        }
      : {}),
  };

  return betterAuth({
    logger: {
      disabled: optionsOnly,
    },
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    socialProviders,
    plugins: [convex()],
  });
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
});

export const getAuthProviderStatus = query({
  args: {},
  handler: async () => {
    const siteUrl = getAuthSiteUrl();
    const { githubClientId, githubClientSecret } =
      getSocialProviderCredentials();

    return {
      siteUrl,
      githubConfigured: Boolean(githubClientId && githubClientSecret),
    };
  },
});

type CredentialAccount = {
  _id: string;
  password?: string | null;
};

export const getDeleteAccountGuard = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);
    if (!user) {
      return {
        authenticated: false,
        hasCredentialPassword: false,
      };
    }

    const credentialAccount = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "account",
      where: [
        { field: "userId", operator: "eq", value: user._id },
        { field: "providerId", operator: "eq", value: "credential" },
      ],
    })) as CredentialAccount | null;

    return {
      authenticated: true,
      hasCredentialPassword: Boolean(credentialAccount?.password),
    };
  },
});

async function assertValidDeletePassword(ctx: MutationCtx, password: string) {
  const user = await authComponent.getAuthUser(ctx);
  if (!user) {
    throw new ConvexError("Not authenticated");
  }

  const credentialAccount = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "account",
    where: [
      { field: "userId", operator: "eq", value: user._id },
      { field: "providerId", operator: "eq", value: "credential" },
    ],
  })) as CredentialAccount | null;

  if (!credentialAccount?.password) {
    throw new ConvexError(
      "No password found for this account. Set a password first before deleting your account."
    );
  }

  const validPassword = await verifyPassword({
    hash: credentialAccount.password,
    password,
  });

  if (!validPassword) {
    throw new ConvexError("Incorrect password");
  }

  return user;
}

export const verifyDeletePassword = mutation({
  args: {
    password: v.string(),
  },
  handler: async (ctx, args) => {
    await assertValidDeletePassword(ctx, args.password);
    return { ok: true };
  },
});

export const deleteAccountCascade = mutation({
  args: {
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await assertValidDeletePassword(ctx, args.password);

    const posts = await ctx.db
      .query("posts")
      .filter((q) => q.eq(q.field("authorId"), user._id))
      .collect();
    for (const post of posts) {
      const postComments = await ctx.db
        .query("comments")
        .filter((q) => q.eq(q.field("postId"), post._id))
        .collect();
      for (const comment of postComments) {
        await ctx.db.delete(comment._id);
      }
      await ctx.db.delete(post._id);
    }

    const comments = await ctx.db
      .query("comments")
      .filter((q) => q.eq(q.field("authorId"), user._id))
      .collect();
    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    const limits = await ctx.db
      .query("rateLimits")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();
    for (const rateLimit of limits) {
      await ctx.db.delete(rateLimit._id);
    }

    const presences = await ctx.db
      .query("presences")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .collect();
    for (const presence of presences) {
      await ctx.db.delete(presence._id);
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

    await ctx.runMutation(
      components.betterAuth.adapter.deleteMany as never,
      {
        input: {
          model: "account",
          where: [{ field: "userId", operator: "eq", value: user._id }],
        },
      } as never
    );

    await ctx.runMutation(
      components.betterAuth.adapter.deleteOne as never,
      {
        input: {
          model: "user",
          where: [{ field: "_id", operator: "eq", value: user._id }],
        },
      } as never
    );

    return { success: true };
  },
});
