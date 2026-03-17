import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CommentSection } from "@/components/web/CommentSection";
import { PostContent } from "@/components/web/PostContent";
import Footer from "@/components/web/Footer";
import { api } from "@/convex/_generated/api";
import { preloadQuery } from "convex/nextjs";
import { ArrowLeft, BookType, Calendar, ClockFading, User } from "lucide-react";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import CopyPostButton from "@/components/web/CopyPostButton";
import { injectShikiIntoHtml } from "@/lib/highlight-post";
import { getCachedPost } from "@/lib/get-post";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import { Id } from "@/convex/_generated/dataModel";

interface PostSlugRouteProps {
  params: Promise<{ slug: string }>;
}

const fallbackMetadata: Metadata = {
  title: "Post",
  description: "Read our latest articles and insights.",
  authors: [{ name: "The Community at The Web Room" }],
};

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
    const post = await getCachedPost(slug);
    if (!post) return fallbackMetadata;

    const description = (
      post.subtitle?.trim() ||
      post.body?.trim() ||
      `Read ${post.title} on our blog.`
    )
      .replace(/<[^>]*>?/gm, "")
      .replace(/["']/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 155)
      .trim();

    return {
      title: post.title,
      description,
      authors: [{ name: post.authorName }],
      openGraph: { title: post.title, description, type: "article", authors: [post.authorName] },
      twitter: { card: "summary_large_image", title: post.title, description },
    };
  } catch {
    return fallbackMetadata;
  }
}

// ── Isolated component — preloadQuery lives here, inside Suspense ─────────────
async function CommentsLoader({
  postId,
  postAuthorId,
}: {
  postId: Id<"posts">;
  postAuthorId: string;
}) {
  const preloadedComments = await preloadQuery(api.comment.getCommentsByPostId, { postId });
  return (
    <CommentSection
      preloadedComments={preloadedComments}
      postId={postId}
      postAuthorId={postAuthorId}
    />
  );
}

function CommentsSkeleton() {
  return (
    <div className="w-full space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  );
}

// ── Thin synchronous shell — no awaiting, no data fetching ───────────────────
export default function PostSlugRoute({ params }: PostSlugRouteProps) {
  return (
    <Suspense fallback={<PostSkeleton />}>
      <PostBody params={params} />
    </Suspense>
  );
}

// ── Skeleton for the outer Suspense ───────────────────────────────────────────
function PostSkeleton() {
  return (
    <div className="flex flex-col w-full max-w-3xl min-h-screen pt-20 px-4 mx-auto">
      <div className="flex flex-col w-full items-start justify-center gap-8">
        <Skeleton className="h-8 w-24" />
        <div className="flex flex-col w-full gap-4">
          <Skeleton className="h-11 w-3/4 sm:w-1/2" />
          <Skeleton className="h-6 w-2/3 sm:w-1/3" />
          <Separator className="my-4" />
          <div className="relative h-[260px] w-full overflow-hidden rounded-xl sm:h-[340px] lg:h-[380px]">
            <Skeleton className="w-full h-full rounded-xl" />
          </div>
          <div className="mt-10 space-y-2">
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-2/3 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}


// ── All data fetching lives here, safely inside Suspense ─────────────────────
async function PostBody({ params }: PostSlugRouteProps) {
  const { slug } = await params; // ← params accessed inside Suspense now
  const post = await getCachedPost(slug);
  if (!post) return notFound();

  const contentHtml = post.contentHtml || `<p>${post.body}</p>`;
  const highlightedHtml = await injectShikiIntoHtml(contentHtml);

  return (
    <div className="flex flex-col w-full max-w-3xl min-h-screen pt-20 px-4 mx-auto">
      <div className="flex flex-col w-full items-start justify-center gap-8">
        <Link href="/posts" className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" className="relative flex items-center justify-start z-20">
            <ArrowLeft className="h-4 w-4" />
            All posts
          </Button>
        </Link>

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

        <Suspense fallback={<CommentsSkeleton />}>
          <CommentsLoader postId={post._id} postAuthorId={post.authorId} />
        </Suspense>

        <div className="w-full">
          <Footer />
        </div>
      </div>
    </div>
  );
}
