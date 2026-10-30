import { revalidateTag } from "next/cache";
import { verifyRevalidation } from "@/lib/revalidate-signature";

// Convex calls this when it changes pages on its own, e.g. a scheduled post going out
// (#60). Only signed requests are accepted, and only the blog's own cache tags.
const ALLOWED_TAG = /^(blog|post-[a-z0-9-]+)$/;

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return new Response("Not configured", { status: 503 });

  const body = await request.text();
  if (!(await verifyRevalidation(secret, request.headers, body))) {
    return new Response("Forbidden", { status: 403 });
  }

  let tags: unknown;
  try {
    tags = (JSON.parse(body) as { tags?: unknown }).tags;
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === "string" && ALLOWED_TAG.test(tag))) {
    return new Response("Bad request", { status: 400 });
  }

  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidated: tags });
}
