import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface PostCardProps {
  post: {
    slug?: string;
    title: string;
    subtitle?: string;
    topic: string;
    minRead?: number;
  };
}

// Hover and keyboard focus share one state: the arrow slides in and the title shifts, so
// focus stays visible without the browser's ring.
export function PostCard({ post }: PostCardProps) {
  return (
    <Link href={`/posts/${post.slug}`} className="group block outline-none">
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center border-b border-dashed py-4 gap-3 md:gap-12">
        <div
          aria-hidden
          className="pointer-events-none hidden absolute left-2 top-8 md:flex items-center justify-center opacity-0
            -translate-x-10 transition-all duration-200 ease-out
            group-hover:opacity-100 group-hover:translate-x-0
            group-focus-visible:opacity-100 group-focus-visible:translate-x-0"
        >
          <ArrowRight className="h-5 w-5 text-black dark:text-white" />
        </div>
        <div
          className="flex w-full flex-row min-w-0 items-start justify-between
            transition-transform duration-300 ease-out
            md:group-hover:translate-x-10 md:group-focus-visible:translate-x-10"
        >
          <div className="flex flex-col flex-1 min-w-0">
            <h2 className="text-xl font-bold line-clamp-1 break-all group-focus-visible:text-primary">
              {post.title}
            </h2>
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
  );
}
