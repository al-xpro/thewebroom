import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
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
  description: "Read our latest articles and insights.",
  category: "Blog",
  authors: [{ name: "The Community at The Web Room" }],
};

interface BlogPageProps {
  searchParams: Promise<{ topics?: string; page?: string }>;
}

export default function BlogPage({ searchParams }: BlogPageProps) {
  return (
    <div className="flex flex-col pt-20 max-w-3xl mx-auto px-4">
      <section className="flex-1 flex flex-col items-start gap-5 py-5 border-b">
        <h1 className="text-4xl font-extrabold text-primary">Posts</h1>
        <Suspense fallback={<FiltersSkeleton />}>
          <DynamicContent searchParams={searchParams} />
        </Suspense>
      </section>

      <Suspense fallback={<SkeletonLoadingUi />}>
        <LoadBlogList searchParams={searchParams} />
      </Suspense>

      <Newsletter />
      <Suspense fallback={<div>Loading ...</div>}>
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
  searchParams: Promise<{ topics?: string; page?: string }>;
}) {
  await connection();
  const { topics, page } = await searchParams;
  const activeTopics = topics ? topics.split(",").filter(Boolean) : [];
  // Parse page server-side and pass as prop — keeps PaginatedPosts off useSearchParams for reads
  const currentPage = Math.max(1, Number(page ?? 1));
  return <FilteredPosts activeTopics={activeTopics} currentPage={currentPage} />;
}

async function FilteredPosts({
  activeTopics,
  currentPage,
}: {
  activeTopics: string[];
  currentPage: number;
}) {
  "use cache";
  cacheLife("seconds");
  cacheTag("blog");

  const data = await fetchQuery(api.posts.getPublishedPosts);

  const filtered =
    activeTopics.length > 0 ? data.filter((post) => activeTopics.includes(post.topic ?? "")) : data;

  if (filtered.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-paragraph">No posts found for the selected topic.</p>
      </div>
    );
  }

  return <PaginatedPosts posts={filtered} currentPage={currentPage} />;
}

function FiltersSkeleton() {
  return (
    <div className="flex gap-2 flex-wrap">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="h-9 w-28 rounded-full bg-[#EDEDED] dark:bg-[#202020] animate-pulse"
        />
      ))}
    </div>
  );
}

function SkeletonLoadingUi() {
  return (
    <div className="grid gap-6 py-10 grid-rows-10">
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="relative flex w-full flex-col sm:flex-row min-w-0 items-center justify-center border-b border-dashed h-[119px] sm:h-[85px] gap-6 sm:gap-10"
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
