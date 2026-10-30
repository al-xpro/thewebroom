import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import { AuroraText } from "@/components/ui/aurora-text";
import Footer from "@/components/web/Footer";
import { api } from "@/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { SignatureIcon } from "@/public/SignatureIcon";
import Newsletter from "@/components/web/Newsletter";
import { cacheLife, cacheTag } from "next/cache";
import { AvatarCircles } from "@/components/ui/avatar-magicui";
import { PostCard } from "@/components/web/PostCard";

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
            &quot;A home for developers building on the Vercel stack. We cover Next.js from routing
            to deployment, UI engineering with React, TypeScript and Tailwind CSS, the Vercel AI
            ecosystem, and the mindset shift that makes it all sustainable. Let&apos;s get started
            together!&quot;
          </p>
        </div>

        <SignatureIcon className="text-black dark:text-white" />
      </section>
      {/* Latest Posts on Home */}
      <section className="relative py-10 divider-fade-top">
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
        </div>
      </section>
      <Newsletter />
      <div className="flex flex-col w-full h-full items-start justify-center py-4 gap-5">
        <div className="relative flex w-full items-center justify-between gap-4">
          <h2 className="text-sm uppercase font-medium tracking-[0.18em] text-left text-primary">
            Beyond the Blog
          </h2>

          <AvatarCircles numPeople={99} />
        </div>
        <p className="text-justify text-lg leading-normal text-paragraph">
          Check out each and every one of us. We&apos;re a team of passionate web developers who are
          dedicated to sharing knowledge and insights with you.
        </p>
      </div>

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
    return <p className="text-sm text-paragraph py-4">No posts yet. Check back soon.</p>;
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
