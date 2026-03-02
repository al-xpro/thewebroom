import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Suspense } from "react";
import { AuroraText } from "@/components/ui/aurora-text";
import Footer from "@/components/web/Footer";
import { api } from "@/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { cacheLife, cacheTag } from "next/cache";
import { SignatureIcon } from "@/public/SignatureIcon";
import Newsletter from "@/components/web/Newsletter";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col pt-20 max-w-3xl mx-auto px-4">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-start justify-center text-center gap-5 py-5">
        <div className="space-y-6 mx-auto text-left">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
            <AuroraText>The Web Room</AuroraText>
          </h1>
          <p className="md:text-xl text-paragraph leading-relaxed">
            "Welcome to our blog! Here, our community share everything related to web development,
            including tutorials, tips, and insights. Join hundreds of developers and stay up-to-date
            with the latest trends and best practices."
          </p>
        </div>

        <SignatureIcon className="text-black dark:text-white" />
      </section>
      {/* Latest Posts on Home */}
      <section className="py-10 border-t">
        <div className="mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="text-left">
              <h6 className="text-sm font-medium text-primary uppercase tracking-[0.18em]">
                Latest Posts
              </h6>
            </div>
          </div>

          <Suspense
            fallback={
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex flex-col space-y-3 rounded-xl border bg-card/40 p-4">
                    <Skeleton className="h-40 w-full rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
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
        <h2 className="text-sm uppercase font-medium tracking-[0.18em] text-left text-primary">
          Beyond the Blog
        </h2>
        <p className="text-left md:text-xl leading-normal text-paragraph">
          Check out each and every one of us. We're a team of passionate web developers who are
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

  const data = await fetchQuery(api.posts.getPublishedPosts);
  const limitedPosts = data?.slice(0, 3) || [];

  return (
    <div className="grid gap-6 grid-rows-3">
      {limitedPosts.map((post) => (
        <Link key={post._id} href={`/posts/${post.slug}`} className="group block">
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center border-b border-dashed py-4 gap-3 sm:gap-0">
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
}
