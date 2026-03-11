"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function PaginatedPosts({ posts }: { posts: any[] }) {
  const [visible, setVisible] = useState(10);

  const showMore = () => {
    setVisible((prev) => prev + 5);
  };

  const visiblePosts = posts.slice(0, visible);
  const hasMore = visible < posts.length;

  return (
    <div className="grid gap-6 py-10">
      {visiblePosts.map((post) => (
        <Link key={post._id} href={`/posts/${post.slug}`} className="group block">
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center border-b border-dashed py-4 gap-3 sm:gap-0">
            <div className="hidden absolute left-2 top-8 md:flex items-center justify-center opacity-0 -translate-x-10 transition-all duration-200 ease-out group-hover:opacity-100 group-hover:translate-x-0">
              <ArrowRight className="h-5 w-5 text-black dark:text-white" />
            </div>

            <div className="flex w-full flex-row min-w-0 items-start justify-between transition-transform duration-300 ease-out md:group-hover:translate-x-10">
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

      {hasMore && (
        <div className="flex justify-center pt-6">
          <button
            onClick={showMore}
            className="px-6 py-2 rounded-lg border border-dashed text-sm font-medium hover:bg-primary/10 transition"
          >
            Show More Posts
          </button>
        </div>
      )}
    </div>
  );
}