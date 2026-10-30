/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agentLimits from "../agentLimits.js";
import type * as agents from "../agents.js";
import type * as assistant from "../assistant.js";
import type * as auth from "../auth.js";
import type * as avatars from "../avatars.js";
import type * as comment from "../comment.js";
import type * as community from "../community.js";
import type * as crons from "../crons.js";
import type * as emailSender from "../emailSender.js";
import type * as emailTemplates from "../emailTemplates.js";
import type * as emails from "../emails.js";
import type * as follows from "../follows.js";
import type * as http from "../http.js";
import type * as ipBans from "../ipBans.js";
import type * as metrics from "../metrics.js";
import type * as migrations from "../migrations.js";
import type * as moderation from "../moderation.js";
import type * as newsletter from "../newsletter.js";
import type * as notifications from "../notifications.js";
import type * as passwordReset from "../passwordReset.js";
import type * as posts from "../posts.js";
import type * as presence from "../presence.js";
import type * as rateLimiting from "../rateLimiting.js";
import type * as reports from "../reports.js";
import type * as reading from "../reading.js";
import type * as revalidate from "../revalidate.js";
import type * as scheduledPosts from "../scheduledPosts.js";
import type * as topics from "../topics.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agentLimits: typeof agentLimits;
  agents: typeof agents;
  assistant: typeof assistant;
  auth: typeof auth;
  avatars: typeof avatars;
  comment: typeof comment;
  community: typeof community;
  crons: typeof crons;
  emailSender: typeof emailSender;
  emailTemplates: typeof emailTemplates;
  emails: typeof emails;
  follows: typeof follows;
  http: typeof http;
  ipBans: typeof ipBans;
  metrics: typeof metrics;
  migrations: typeof migrations;
  moderation: typeof moderation;
  newsletter: typeof newsletter;
  notifications: typeof notifications;
  passwordReset: typeof passwordReset;
  posts: typeof posts;
  presence: typeof presence;
  rateLimiting: typeof rateLimiting;
  reports: typeof reports;
  reading: typeof reading;
  revalidate: typeof revalidate;
  scheduledPosts: typeof scheduledPosts;
  topics: typeof topics;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  presence: import("@convex-dev/presence/_generated/component.js").ComponentApi<"presence">;
};
