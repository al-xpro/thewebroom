import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CommentSection } from "@/components/web/CommentSection";
import { PostContent } from "@/components/web/PostContent";
import Footer from "@/components/web/Footer";
import { api } from "@/convex/_generated/api";
import { fetchQuery, preloadQuery } from "convex/nextjs";
import { ArrowLeft, BookType, Calendar, ClockFading, User } from "lucide-react";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import CopyPostButton from "@/components/web/CopyPostButton";
import { connection } from "next/server";
import { injectShikiIntoHtml } from "@/lib/highlight-post";
import { Skeleton } from "@/components/ui/skeleton";
import { cacheLife, cacheTag } from "next/cache";

interface PostSlugRouteProps {
  params: Promise<{ slug: string }>;
}

const fallbackMetadata: Metadata = {
  title: "Post",
  description: "Read our latest articles and insights.",
  authors: [{ name: "The Community at The Web Room" }],
};

// ─── Cached data fetcher ──────────────────────────────────────────────────────
// Wrapping fetchQuery in "use cache" is required because ConvexHttpClient
// calls Math.random() internally. Next.js 16 with cacheComponents: true
// forbids non-deterministic values in server components before any dynamic
// data source is accessed. Cache components are exempt from this restriction.
async function getCachedPost(slug: string) {
  "use cache";
  cacheTag(`post:${slug}`, "blog");
  cacheLife("seconds");
  return fetchQuery(api.posts.getPostBySlug, { slug });
}

async function getCachedHighlightedPost(slug: string) {
  "use cache";
  cacheTag(`post-html:${slug}`, "blog");
  cacheLife("minutes");
  const post = await fetchQuery(api.posts.getPostBySlug, { slug });
  if (!post) return null;
  const contentHtml = post.contentHtml || `<p>${post.body}</p>`;
  const highlightedHtml = await injectShikiIntoHtml(contentHtml);
  return { post, highlightedHtml };
}

export async function generateStaticParams() {
  try {
    const res = await fetch(`${process.env.CONVEX_SITE_URL}/posts-slugs`);
    if (!res.ok) return [];
    const slugs: string[] = await res.json();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PostSlugRouteProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    // Using the cached helper avoids the Math.random() restriction
    const post = await getCachedPost(slug);
    if (!post) return fallbackMetadata;

    const description =
      post.subtitle?.trim() ||
      post.body?.slice(0, 155).trim() ||
      `Read ${post.title} on The Web Room.`;

    return {
      title: post.title,
      description,
      authors: [{ name: post.authorName }],
      openGraph: {
        title: post.title,
        description,
        type: "article",
        authors: [post.authorName],
        ...(post.imageUrl ? { images: [{ url: post.imageUrl }] } : {}),
      },
      twitter: {
        card: "summary_large_image",
        title: post.title,
        description,
        ...(post.imageUrl ? { images: [post.imageUrl] } : {}),
      },
    };
  } catch {
    return fallbackMetadata;
  }
}

// Static shell — sync, no data fetching, renders immediately from prebuilt HTML
export default function PostSlugRoute({ params }: PostSlugRouteProps) {
  return (
    <div className="flex flex-col w-full max-w-3xl min-h-screen pt-20 px-4 mx-auto">
      <div className="flex flex-col w-full items-start justify-center gap-8">
        <Link href="/posts" className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="relative flex items-center justify-start z-20"
          >
            <ArrowLeft className="h-4 w-4" />
            All posts
          </Button>
        </Link>

        {/* connection() and all dynamic data inside Suspense */}
        <Suspense fallback={<PostSkeleton />}>
          <PostBody params={params} />
        </Suspense>
      </div>
    </div>
  );
}

// Dynamic content — streams in after static shell
// connection() here is valid because this component is Suspense-wrapped above
async function PostBody({ params }: PostSlugRouteProps) {
  await connection();
  const { slug } = await params;

  const cached = await getCachedHighlightedPost(slug);
  if (!cached) return notFound();

  const { post, highlightedHtml } = cached;

  const preloadedCommentsData = await preloadQuery(api.comment.getCommentsByPostId, {
    postId: post._id,
  });

  return (
    <>
      <header className="flex flex-col w-full gap-4">
        <h1 className="text-balance text-3xl font-bold tracking-tight text-black dark:text-white sm:text-4xl">
          {post.title}
        </h1>
        <p className="text-lg text-paragraph leading-relaxed">{post.subtitle}</p>
        <Separator className="my-4" />
        <div className="flex flex-wrap items-center justify-between sm:gap-14 text-[11px] sm:text-sm text-paragraph">
          <div className="flex flex-col items-center gap-2 text-black dark:text-white">
            <User className="size-4 sm:size-5" />
            <p>{post.authorName}</p>
          </div>
          <div className="flex flex-col items-center gap-2 text-black dark:text-white">
            <Calendar className="size-4 sm:size-5" />
            <p>{new Date(post._creationTime ?? 0).toLocaleDateString("en-US")}</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <BookType className="size-4 sm:size-5 text-black dark:text-white" />
            <span className="inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full font-medium bg-primary/10 text-primary">
              {post.topic}
            </span>
          </div>
          <div className="flex flex-col items-center gap-2 text-black dark:text-white">
            <ClockFading className="size-4 sm:size-5" />
            <p>{post.minRead} min read</p>
          </div>
          <CopyPostButton />
        </div>
      </header>

      <div className="relative mb-8 h-[260px] w-full overflow-hidden rounded-xl shadow-sm sm:h-[340px] lg:h-[380px]">
        <Image
          src={post.imageUrl ?? ""}
          alt="post image"
          fill
          sizes="(max-width: 640px) 100vw, 33vw"
          priority
          loading="eager"
          fetchPriority="high"
          className="object-cover transition-transform duration-500"
        />
      </div>

      <PostContent html={highlightedHtml} />

      <Separator className="my-8" />

      <CommentSection
        preloadedComments={preloadedCommentsData}
        postId={post._id}
        postAuthorId={post.authorId}
      />

      <div className="w-full">
        <Footer />
      </div>
    </>
  );
}

function PostSkeleton() {
  return (
    <>
      <div className="flex flex-col w-full gap-4">
        <Skeleton className="h-10 w-3/4 rounded-lg" />
        <Skeleton className="h-6 w-1/2 rounded-lg" />
        <Separator className="my-4" />
        <div className="flex gap-8">
          <Skeleton className="h-5 w-20 rounded" />
          <Skeleton className="h-5 w-20 rounded" />
          <Skeleton className="h-5 w-20 rounded" />
        </div>
      </div>
      <Skeleton className="h-[260px] w-full rounded-xl sm:h-[340px] lg:h-[380px]" />
      <div className="flex flex-col gap-4 w-full">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-5 w-full rounded" />
        ))}
      </div>
    </>
  );
}