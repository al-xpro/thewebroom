import { MetadataRoute } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

/**
 * Dynamic sitemap.xml generation for The Web Room
 * This file generates a sitemap with all public blog posts
 * 
 * Accessed at: https://thewebroom.com/sitemap.xml
 * Priority for indexing by search engines
 * 
 * Reference: https://www.sitemaps.org/protocol.html
 */

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    // Fetch all published posts from Convex backend
    const posts = await fetchQuery(api.posts.getPublishedPosts, {});

    // Ensure we have a valid posts array
    const publishedPosts = Array.isArray(posts) ? posts : [];

    // Map posts to sitemap entries (filter for valid slugs)
    const postEntries: MetadataRoute.Sitemap = publishedPosts
      .filter((post: any) => post?.slug)
      .map((post: any) => ({
        url: `https://thewebroom.vercel.app/posts/${post.slug}`,
        lastModified: new Date(post._creationTime || Date.now()),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));

    // Combine static pages with dynamic posts
    return [...getStaticPages(), ...postEntries];
  } catch (error) {
    console.error("[Sitemap][GenerationError]", error);
    // Return static pages only if dynamic generation fails
    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
    return getStaticPages();
  }
}

/**
 * Static pages that are always public and should be indexed
 */
function getStaticPages(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://thewebroom.vercel.app";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0, // Homepage has highest priority
    },
    {
      url: `${baseUrl}/posts`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9, // Blog listing updated daily
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date("2026-03-09"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms-and-conditions`,
      lastModified: new Date("2026-03-09"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
