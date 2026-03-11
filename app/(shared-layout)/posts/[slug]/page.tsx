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

interface PostSlugRouteProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PostSlugRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchQuery(api.posts.getPostBySlug, { slug });

  const description =
    post?.subtitle?.trim() ||
    post?.body?.slice(0, 155).trim() ||
    `Read ${post?.title} on our blog.`;

  return {
    title: post?.title,
    description,
    authors: [{ name: post?.authorName }],
  };
}

export default async function PostSlugRoute({ params }: PostSlugRouteProps) {
  const { slug } = await params;
  const post = await fetchQuery(api.posts.getPostBySlug, { slug });

  if (!post) {
    return notFound();
  }

  const preloadedCommentsData = await preloadQuery(api.comment.getCommentsByPostId, {
    postId: post._id,
  });

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

        <PostContent html={post.contentHtml || `<p>${post.body}</p>`} />

        <Separator className="my-8" />

        <CommentSection
          preloadedComments={preloadedCommentsData}
          postId={post._id}
          postAuthorId={post.authorId}
        />

        <div className="w-full">
          <Footer />
        </div>
      </div>
    </div>
  );
}
