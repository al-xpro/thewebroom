import { httpRouter } from "convex/server";
import { httpAction, type ActionCtx } from "./_generated/server";
import { api } from "./_generated/api";
import { authComponent, createAuth } from "./auth";
import { isIpBannedHttp } from "./ipBans";

const http = httpRouter();

// Every published slug, read a page at a time (#18).
async function allPublishedEntries(ctx: ActionCtx) {
  const entries: { slug: string; createdAt: number }[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 50; i++) {
    const page: { entries: { slug?: string; createdAt: number }[]; isDone: boolean; continueCursor: string } =
      await ctx.runQuery(api.posts.publishedSlugsPage, { cursor });
    for (const entry of page.entries) if (entry.slug) entries.push({ slug: entry.slug, createdAt: entry.createdAt });
    if (page.isDone) break;
    cursor = page.continueCursor;
  }
  return entries;
}

authComponent.registerRoutes(http, createAuth);

http.route({
  path: "/is-ip-banned",
  method: "GET",
  handler: isIpBannedHttp,
});

http.route({
  path: "/post-meta",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const slug = new URL(req.url).searchParams.get("slug");
    if (!slug) return new Response("Missing slug", { status: 400 });

    const post = await ctx.runQuery(api.posts.getPostBySlug, { slug });
    if (!post || (post.status !== undefined && post.status !== "published")) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(
      JSON.stringify({
        title: post.title,
        subtitle: post.subtitle,
        body: post.body,
        authorName: post.authorName,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }),
});

http.route({
  path: "/posts-slugs",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const slugs = (await allPublishedEntries(ctx)).map((entry) => entry.slug);
    return new Response(JSON.stringify(slugs), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/published-posts",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const simplified = await allPublishedEntries(ctx);
    return new Response(JSON.stringify(simplified), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
