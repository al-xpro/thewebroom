import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { isTopic } from "@/convex/topics";
import Footer from "@/components/web/Footer";
import { fetchQuery } from "convex/nextjs";
import { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { Suspense } from "react";
import Newsletter from "@/components/web/Newsletter";
import BlogFilters from "@/components/web/BlogFilters";
import PaginatedPosts from "@/components/web/PaginatedPosts";
import { connection } from "next/server";

export const metadata: Metadata = {
  title: "The Web Room",
  description: "Every post on The Web Room, newest first.",
  category: "Blog",
  authors: [{ name: "The Community at The Web Room" }],
};

interface BlogPageProps {
  searchParams: Promise<{ topics?: string }>;
}

export default function BlogPage({ searchParams }: BlogPageProps) {
  return (
    <div className="flex flex-col pt-20 max-w-3xl mx-auto px-4">
      <section className="relative flex flex-col items-start gap-5 py-10 divider-fade-bottom">
        <h1 className="type-display">Posts</h1>
        <Suspense fallback={<BlogFilters activeTopics={[]} />}>
          <DynamicContent searchParams={searchParams} />
        </Suspense>
      </section>

      <Suspense fallback={<SkeletonLoadingUi />}>
        <LoadBlogList searchParams={searchParams} />
      </Suspense>

      <Newsletter />
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
}

async function DynamicContent({ searchParams }: { searchParams: Promise<{ topics?: string }> }) {
  await connection();
  const { topics } = await searchParams;
  const activeTopics = topics ? topics.split(",").filter(Boolean) : [];
  return <BlogFilters activeTopics={activeTopics} />;
}

async function LoadBlogList({
  searchParams,
}: {
  searchParams: Promise<{ topics?: string }>;
}) {
  await connection();
  const { topics } = await searchParams;
  const activeTopics = topics ? topics.split(",").filter(Boolean) : [];
  return <FilteredPosts activeTopics={activeTopics} />;
}

async function FilteredPosts({ activeTopics }: { activeTopics: string[] }) {
  "use cache";
  cacheLife("seconds");
  cacheTag("blog");

  // Filtered by topic in Convex, through the status and topic index (#18).
  const topics = activeTopics.filter(isTopic);
  const filtered = await fetchQuery(api.posts.getPublishedPosts, {
    limit: 500,
    ...(topics.length > 0 ? { topics } : {}),
  });

  if (filtered.length === 0) {
    return (
      <p className="type-meta py-20 text-center">No posts on this topic yet.</p>
    );
  }

  // Keyed by the filter, so changing topics starts again at ten posts.
  return <PaginatedPosts key={activeTopics.join(",")} posts={filtered} />;
}


function SkeletonLoadingUi() {
  return (
    <div className="grid gap-6 py-10 grid-rows-10">
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="relative flex w-full flex-col sm:flex-row min-w-0 items-center justify-center divider-dashed-fade-bottom h-[119px] sm:h-[85px] gap-6 sm:gap-10"
        >
          <div className="flex flex-col sm:flex-1 items-start justify-center w-full min-w-0 gap-2">
            <Skeleton className="h-6 w-1/2 rounded-lg" />
            <Skeleton className="h-4 w-3/4 rounded-lg" />
          </div>
          <div className="flex sm:flex-col items-center justify-start sm:justify-center w-full sm:w-26 gap-2">
            <Skeleton className="h-3 w-26 rounded-lg" />
            <Skeleton className="h-2 w-18 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
