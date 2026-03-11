import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/post-meta",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const slug = new URL(req.url).searchParams.get("slug");
    if (!slug) return new Response("Missing slug", { status: 400 });

    const post = await ctx.runQuery(api.posts.getPostBySlug, { slug });
    if (!post) return new Response("Not found", { status: 404 });

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

export default http;
