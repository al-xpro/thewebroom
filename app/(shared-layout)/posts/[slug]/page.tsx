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
import { FadeImage } from "@/components/ui/fade-image";
import Link from "next/link";
import { notFound } from "next/navigation";
import CopyPostButton from "@/components/web/CopyPostButton";
import { connection } from "next/server";
import { injectShikiIntoHtml } from "@/lib/highlight-post";
import { escapeHtml, sanitizePostHtml } from "@/lib/sanitize-server";
import { Skeleton } from "@/components/ui/skeleton";
import { TopicBadge } from "@/components/web/TopicBadge";

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
    const res = await fetch(`${process.env.CONVEX_SITE_URL}/post-meta?slug=${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return fallbackMetadata;

    const post = await res.json();
    const description =
      post.subtitle?.trim() || post.body?.slice(0, 155).trim() || `Read ${post.title} on our blog.`;

    return {
      ...fallbackMetadata,
      // The same post as Markdown, for agents.
      alternates: { types: { "text/markdown": `/agents/posts/${slug}` } },
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
            Posts
          </Button>
        </Link>

        <Suspense fallback={<PostSkeleton />}>
          <PostBody params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function PostBody({ params }: PostSlugRouteProps) {
  await connection();
  const { slug } = await params;

  const post = await fetchQuery(api.posts.getPostBySlug, { slug });
  if (!post || (post.status !== undefined && post.status !== "published")) return notFound();

  const preloadedCommentsData = await preloadQuery(api.comment.getCommentsByPostId, {
    postId: post._id,
  });

  const contentHtml = post.contentHtml || `<p>${escapeHtml(post.body)}</p>`;
  // Sanitized on the server: the client's DOMPurify only runs after hydration.
  const highlightedHtml = sanitizePostHtml(await injectShikiIntoHtml(contentHtml));

  return (
    <>
      <header className="flex flex-col w-full gap-4">
        <h1 className="type-display text-balance">
          {post.title}
        </h1>
        <p className="type-body text-lg">{post.subtitle}</p>
        <Separator className="my-4" />
        <div className="flex flex-wrap items-center justify-between sm:gap-14 text-[11px] sm:text-sm text-paragraph">
          <div className="flex flex-col items-center gap-2 text-black dark:text-white">
            <User className="size-4 sm:size-5" />
            <p>{post.authorName}</p>
          </div>
          <div className="flex flex-col items-center gap-2 text-black dark:text-white">
            <Calendar className="size-4 sm:size-5" />
            <p>{new Date(post.publishAt ?? post._creationTime ?? 0).toLocaleDateString("en-US")}</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <BookType className="size-4 sm:size-5 text-black dark:text-white" />
            <TopicBadge topic={post.topic} />
          </div>
          <div className="flex flex-col items-center gap-2 text-black dark:text-white">
            <ClockFading className="size-4 sm:size-5" />
            <p>{post.minRead} min</p>
          </div>
          <div className="flex items-center gap-1">
            <CopyPostButton />
          </div>
        </div>
      </header>

      <div className="flex flex-col w-full">
        <div className="relative mb-8 h-[280px] w-full overflow-hidden rounded-xl bg-[#EDEDED] dark:bg-[#0A0A0A] sm:h-[380px]">
          <FadeImage
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
      </div>

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
        <Skeleton className="h-11 w-3/4 sm:w-1/2" />
        <Skeleton className="h-[25px] w-2/3 sm:w-1/3" />

        <Separator className="my-4" />

        <div className="flex flex-wrap w-full items-center justify-between sm:gap-14">
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="w-6 h-6 rounded-full" />
            <Skeleton className="w-14 h-4" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="w-6 h-6 rounded-full" />
            <Skeleton className="w-14 h-4" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="w-6 h-6 rounded-full" />
            <Skeleton className="w-14 h-4" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="w-6 h-6 rounded-full" />
            <Skeleton className="w-14 h-4" />
          </div>
          <div className="hidden sm:flex flex-col items-center gap-2">
            <Skeleton className="w-6 h-6 rounded-full" />
            <Skeleton className="w-14 h-4" />
          </div>
        </div>
        <div className="relative mt-5 h-[280px] w-full overflow-hidden rounded-xl shadow-sm sm:h-[380px]">
          <Skeleton className="w-full h-full rounded-xl" />
        </div>
        <div className="mt-10 space-y-2">
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-2/3 h-4" />
        </div>
        <Skeleton className="my-5 h-8 w-2/3" />
        <div className="mt-5 space-y-2">
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-2/3 h-4" />
        </div>
        <Skeleton className="mt-5 h-6 w-1/3" />
        <div className="mt-5 space-y-2">
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-full h-4" />
          <Skeleton className="w-2/3 h-4" />
        </div>
      </div>
    </>
  );
}
