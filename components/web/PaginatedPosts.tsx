"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { PostCard } from "@/components/web/PostCard";

const POSTS_PER_PAGE = 10;

// currentPage is passed as a prop from the server — the component does NOT
// call useSearchParams() for reading, which would conflict with "use cache"
// in the parent FilteredPosts server component.
export default function PaginatedPosts({
  posts,
  currentPage,
}: {
  posts: any[];
  currentPage: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
  const start = (currentPage - 1) * POSTS_PER_PAGE;
  const visiblePosts = posts.slice(start, start + POSTS_PER_PAGE);

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`?${params.toString()}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="grid gap-6 py-10">
      {visiblePosts.map((post) => (
        <PostCard key={post._id} post={post} />
      ))}

      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
      )}
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  function getPages(): (number | "...")[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | "...")[] = [];
    const left = currentPage - 1;
    const right = currentPage + 1;

    pages.push(1);
    if (left > 2) pages.push("...");
    for (let i = Math.max(2, left); i <= Math.min(totalPages - 1, right); i++) {
      pages.push(i);
    }
    if (right < totalPages - 1) pages.push("...");
    pages.push(totalPages);

    return pages;
  }

  return (
    <div className="flex items-center justify-center gap-2 pt-6 flex-wrap">
      <Button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        variant="outline"
        type="button"
      >
        <ArrowLeft className="size-4" />
      </Button>

      {getPages().map((page, i) =>
        page === "..." ? (
          <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-sm text-paragraph select-none">
            …
          </span>
        ) : (
          <Button
            key={page}
            onClick={() => onPageChange(page)}
            variant={page === currentPage ? "default" : "outline"}
            type="button"
          >
            {page}
          </Button>
        )
      )}

      <Button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        variant="outline"
        type="button"
      >
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}