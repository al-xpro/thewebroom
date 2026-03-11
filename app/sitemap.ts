import { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://thewebroom.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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