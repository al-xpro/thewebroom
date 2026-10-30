"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";
import { PostCard } from "@/components/web/PostCard";

// A series: its parts in order, published ones only.
export function SeriesClient({ slug }: { slug: string }) {
  const series = useQuery(api.reading.seriesBySlug, { slug });

  if (series === undefined) return <Skeleton className="my-10 h-10 w-2/3" />;
  if (series === null) {
    return (
      <div className="space-y-2 py-10">
        <h1 className="type-display">Not found</h1>
        <p className="type-body">This series has no published parts.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2 py-10">
        <p className="type-label">Series · {series.parts.length} parts</p>
        <h1 className="type-display">{series.title}</h1>
        <p className="type-meta">
          By{" "}
          <Link href={`/members/${series.authorId}`} className="underline underline-offset-4">
            {series.authorName}
          </Link>
        </p>
      </div>
      <ol className="pb-10">
        {series.parts.map((part) => (
          <li key={part.id}>
            <p className="type-meta pt-2 font-mono text-xs">Part {part.number}</p>
            <PostCard post={part} />
          </li>
        ))}
      </ol>
    </>
  );
}
