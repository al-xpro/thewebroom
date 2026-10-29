import { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://thewebroom.vercel.app";

// Cached instead of `dynamic = "force-dynamic"`, which Cache Components rejects. Publishing
// a post invalidates the `blog` tag, so the sitemap refreshes with it.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("hours");
  cacheTag("blog");

  try {
    const res = await fetch(`${process.env.CONVEX_SITE_URL}/published-posts`);
    const posts: { slug: string; createdAt: number }[] = res.ok ? await res.json() : [];

    const postEntries: MetadataRoute.Sitemap = posts
      .filter((post) => post?.slug)
      .map((post) => ({
        url: `${baseUrl}/posts/${post.slug}`,
        lastModified: new Date(post.createdAt || Date.now()),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));

    return [...getStaticPages(), ...postEntries];
  } catch (error) {
    console.error("[Sitemap][GenerationError]", error);
    return getStaticPages();
  }
}

function getStaticPages(): MetadataRoute.Sitemap {
  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/posts`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/privacy-policy`, lastModified: new Date("2026-03-09"), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/terms-and-conditions`, lastModified: new Date("2026-03-09"), changeFrequency: "monthly", priority: 0.5 },
  ];
}