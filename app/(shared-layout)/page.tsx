import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import { AuroraText } from "@/components/ui/aurora-text";
import Footer from "@/components/web/Footer";
import { api } from "@/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import Newsletter from "@/components/web/Newsletter";
import { cacheLife, cacheTag } from "next/cache";
import { PostCard } from "@/components/web/PostCard";

export default function Home() {
  return (
    <div className="flex flex-col pt-20 max-w-3xl mx-auto px-4">
      <section className="flex flex-col gap-4 py-10">
        <h1 className="type-display">
          <AuroraText>The Web Room</AuroraText>
        </h1>
        <p className="type-body text-lg max-w-xl">
          A community for writing about web architecture, UI engineering, AI and productivity, with an AI assistant when you want one.
        </p>
      </section>

      <section className="relative py-10 divider-fade-top space-y-6">
        <h2 className="type-label">Latest</h2>
        <Suspense
          fallback={
            <div className="grid gap-6 grid-rows-3">
              {[...Array(3)].map((_, i) => (
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
          }
        >
          <LoadHomePostList />
        </Suspense>
      </section>

      <Newsletter />

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
}

export async function LoadHomePostList() {
  "use cache";
  cacheLife("seconds");
  cacheTag("blog");

  // Only the fetch is guarded: JSX built inside try/catch wouldn't have its render errors
  // caught there anyway (react-hooks/error-boundaries).
  let limitedPosts: Awaited<ReturnType<typeof fetchPublishedPosts>> = [];
  try {
    limitedPosts = (await fetchPublishedPosts()).slice(0, 3);
  } catch (error) {
    // fetchQuery can fail at build time if Convex is unreachable.
    console.error("[LoadHomePostList] fetchQuery failed:", error);
  }

  if (limitedPosts.length === 0) {
    return <p className="type-meta py-4">No posts yet.</p>;
  }

  return (
    <div className="grid gap-6 grid-rows-3">
      {limitedPosts.map((post) => (
        <PostCard key={post._id} post={post} />
      ))}
    </div>
  );
}

async function fetchPublishedPosts() {
  return (await fetchQuery(api.posts.getPublishedPosts)) ?? [];
}
