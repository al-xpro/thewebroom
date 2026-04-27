import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { authComponent, createAuth } from "./auth";
import { isIpBannedHttp } from "./ipBans";

const http = httpRouter();

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
    const posts = await ctx.runQuery(api.posts.getAllPostSlugs);
    const slugs = posts
      .map((p: { slug: string | undefined }) => p.slug)
      .filter((slug): slug is string => slug !== undefined);
    return new Response(JSON.stringify(slugs), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/published-posts",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const posts = await ctx.runQuery(api.posts.getPublishedPosts);
    const simplified = posts.map((p) => ({
      slug: p.slug,
      createdAt: p._creationTime,
    }));
    return new Response(JSON.stringify(simplified), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
