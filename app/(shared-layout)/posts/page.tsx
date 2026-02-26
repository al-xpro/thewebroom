import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import Footer from "@/components/web/Footer";
import { fetchQuery } from "convex/nextjs";
import { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import Newsletter from "@/components/web/Newsletter";
import BlogFilters from "@/components/web/BlogFilters";

export const metadata: Metadata = {
  title: "The Web Room",
  description: "Read our latest articles and insights.",
  category: "Blog",
  authors: [{ name: "The Community at The Web Room" }],
};

interface BlogPageProps {
  searchParams: Promise<{ topics?: string }>;
}

// Synchronous shell — renders the static parts of the page immediately
// without touching any dynamic request-time data (no searchParams here).
// The dynamic parts (filters + post list) live inside Suspense so PPR
// can stream them in after the static shell is already on screen.
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
      <Footer />
    </div>
  );
}

// Async component — safely awaits searchParams inside Suspense.
// Renders the filter buttons with the correct active state from the URL.
async function DynamicContent({ searchParams }: { searchParams: Promise<{ topics?: string }> }) {
  const { topics } = await searchParams;
  const activeTopics = topics ? topics.split(",").filter(Boolean) : [];
  return <BlogFilters activeTopics={activeTopics} />;
}

async function LoadBlogList({ searchParams }: { searchParams: Promise<{ topics?: string }> }) {
  "use cache";
  cacheLife("hours");
  cacheTag("blog");

  const { topics } = await searchParams;
  const activeTopics = topics ? topics.split(",").filter(Boolean) : [];

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

  return (
    <div className="grid gap-6 grid-rows-3 py-10">
      {filtered.map((post) => (
        <Link key={post._id} href={`/posts/${post.slug}`} className="group block">
          <div className="relative flex flex-row items-center border-b border-dashed py-4">
            <div
              className="hidden absolute left-2 top-8 md:flex items-center justify-center opacity-0
              -translate-x-10 transition-all duration-200 ease-out
              group-hover:opacity-100 group-hover:translate-x-0"
            >
              <ArrowRight className="h-5 w-5 text-black dark:text-white" />
            </div>
            <div
              className="flex w-full flex-row items-start justify-between
              transition-transform duration-300 ease-out
              md:group-hover:translate-x-10"
            >
              <div className="flex flex-col w-2/3 min-w-[150px]">
                <h1 className="text-xl font-bold">{post.title}</h1>
                <p className="text-paragraph line-clamp-2">{post.subtitle}</p>
              </div>
            </div>
            <div className="flex flex-col min-w-[120px] max-w-[140px] w-1/3 items-center justify-center gap-2 text-[12px] sm:text-sm text-paragraph">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium bg-primary/10 text-primary">
                {post.topic}
              </span>
              <p className="text-sm text-paragraph whitespace-nowrap">{post.minRead} min read</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
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
    <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <div className="flex flex-col space-y-3" key={i}>
          <Skeleton className="h-48 w-full rounded-xl" />
          <div className="space-y-2 flex flex-col">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
