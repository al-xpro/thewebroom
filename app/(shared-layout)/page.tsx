import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Suspense } from "react";
import { AuroraText } from "@/components/ui/aurora-text";
import Footer from "@/components/web/Footer";
import { api } from "@/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { SignatureIcon } from "@/public/SignatureIcon";
import Newsletter from "@/components/web/Newsletter";
import { ArrowRight } from "lucide-react";
import { cacheLife, cacheTag } from "next/cache";

export default function Home() {
  return (
    <div className="flex flex-col pt-20 max-w-3xl mx-auto px-4">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-start justify-center text-center gap-5 py-5">
        <div className="space-y-6 mx-auto text-left">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
            <AuroraText>The Web Room</AuroraText>
          </h1>
          <p className="text-lg text-paragraph leading-relaxed text-justify">
            "A home for developers building on the Vercel stack. We cover Next.js from routing to
            deployment, UI engineering with React, TypeScript and Tailwind CSS, the Vercel AI
            ecosystem, and the mindset shift that makes it all sustainable. Let's
            get started together!"
          </p>
        </div>

        <SignatureIcon className="text-black dark:text-white" />
      </section>
      {/* Latest Posts on Home */}
      <section className="py-10 border-t">
        <div className="mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="text-left">
              <h2 className="text-sm font-medium text-primary uppercase tracking-[0.18em]">
                Latest Posts
              </h2>
            </div>
          </div>

          <Suspense
            fallback={
              <div className="grid gap-6 grid-rows-3">
                {[...Array(3)].map((_, i) => (
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
            }
          >
            <LoadHomePostList />
          </Suspense>
        </div>
      </section>
      <Newsletter />

      <Suspense fallback={<div>Loading footer...</div>}>
        <Footer />
      </Suspense>
    </div>
  );
}

export async function LoadHomePostList() {
  "use cache";
  cacheLife("seconds");
  cacheTag("blog");

  try {
    const data = await fetchQuery(api.posts.getPublishedPosts);
    const limitedPosts = data?.slice(0, 3) ?? [];

    if (limitedPosts.length === 0) {
      return <p className="text-sm text-paragraph py-4">No posts yet. Check back soon.</p>;
    }

    return (
      <div className="grid gap-6 grid-rows-3">
        {limitedPosts.map((post) => (
          <Link key={post._id} href={`/posts/${post.slug}`} className="group block">
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center border-b border-dashed py-4 gap-3 md:gap-12">
              <div
                className="hidden absolute left-2 top-8 md:flex items-center justify-center opacity-0
                -translate-x-10 transition-all duration-200 ease-out
                group-hover:opacity-100 group-hover:translate-x-0"
              >
                <ArrowRight className="h-5 w-5 text-black dark:text-white" />
              </div>
              <div
                className="flex w-full flex-row min-w-0 items-start justify-between
                transition-transform duration-300 ease-out
                md:group-hover:translate-x-10"
              >
                <div className="flex flex-col flex-1 min-w-0">
                  <h1 className="text-xl font-bold line-clamp-1 break-all">{post.title}</h1>
                  <p className="text-paragraph line-clamp-1 break-all">{post.subtitle}</p>
                </div>
              </div>
              <div className="flex flex-row sm:flex-col sm:min-w-[120px] sm:max-w-[140px] w-full sm:w-1/3 items-center justify-start sm:justify-center gap-2 text-[12px] sm:text-sm text-paragraph">
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
  } catch (error) {
    // fetchQuery can fail at build time if Convex is unreachable.
    console.error("[LoadHomePostList] fetchQuery failed:", error);
    return <p className="text-sm text-paragraph py-4">No posts yet. Check back soon.</p>;
  }
}
