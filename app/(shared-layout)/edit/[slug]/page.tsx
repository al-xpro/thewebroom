import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getToken } from "@/lib/auth-server";
import { EditPostClient } from "./EditPostClient";

interface EditPostRouteProps {
  params: Promise<{ slug: string }>;
}

async function EditPostContent({ params }: { params: Promise<{ slug: string }> }) {
  await connection();

  const [{ slug }, token] = await Promise.all([params, getToken().catch(() => null)]);

  const post = await fetchQuery(api.posts.getPostBySlug, { slug });
  if (!post) notFound();

  if (!token) {
    notFound();
  }

  // Fetch the current user with the token so we can check ownership
  const currentUser = await fetchQuery(api.auth.getCurrentUser, {}, { token });

  if (!currentUser) notFound();

  // Check admin status
  const isAdmin = await fetchQuery(api.auth.getIsAdmin, {}, { token });

  // Only the post author or an admin may edit — everyone else gets 404.
  // Returning 404 (instead of 403) avoids leaking that the post exists
  // and that the viewer is not the owner.
  const isAuthor = post.authorId === currentUser._id;
  if (!isAuthor && !isAdmin) {
    notFound();
  }

  return <EditPostClient post={post} initialUser={currentUser} />;
}

function EditPostSkeleton() {
  return (
    <div className="flex flex-col w-full gap-8 pb-16 animate-pulse">
      {/* Fixed Toolbar Placeholder - Matches fixed position of actual toolbar */}
      <div className="fixed bottom-0 left-0 w-full sm:bottom-auto sm:top-0 z-50 border-t sm:border-t-0 sm:border-b border-[#EAEAEA] dark:border-[#1E1E1E] bg-[#EDEDED] dark:bg-[#0A0A0A]">
        <div className="flex items-center gap-2 px-3 py-2 w-max mx-auto h-[45px]">
          {/* Simulate button groups */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex gap-2 items-center">
              <Skeleton className="h-8 w-8 rounded-md bg-white/50 dark:bg-white/10" />
              {i % 2 === 0 && <div className="h-6 w-px bg-gray-300 dark:bg-gray-800" />}
            </div>
          ))}
        </div>
      </div>

      {/* Header Navigation Simulation */}
      <div className="flex items-center justify-between gap-3 pt-4 sm:pt-0">
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      <article className="flex flex-col gap-8">
        <header className="flex flex-col gap-4">
          {/* Title - Matches text-3xl/4xl height */}
          <div className="space-y-2">
            <Skeleton className="h-10 w-3/4 sm:w-2/3" />
          </div>

          {/* Subtitle - Matches text-lg height */}
          <div className="space-y-2">
            <Skeleton className="h-7 w-full" />
          </div>

          <Separator className="my-4" />

          {/* Meta Row - Matches flex-wrap items-center justify-between */}
          <div className="flex items-center justify-between gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
            <div className="hidden sm:flex flex-col items-center gap-2">
               <Skeleton className="h-5 w-5 rounded-sm" />
               <Skeleton className="h-3 w-12" />
            </div>
          </div>
        </header>

        {/* Image Preview Area - Matches h-[280px]/[380px] */}
        <div className="relative h-[280px] w-full overflow-hidden rounded-md border border-[#EAEAEA] dark:border-[#1E1E1E] sm:h-[380px]">
          <Skeleton className="h-full w-full" />
          {/* Floating Badge Simulation */}
          <div className="absolute inset-x-0 bottom-12 flex justify-center">
             <Skeleton className="h-10 w-64 rounded-full border border-white/20" />
          </div>
        </div>

        {/* Editor Content Area */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-5/6" />
          <Skeleton className="h-6 w-4/6" />
          <Skeleton className="h-[300px] w-full rounded-md" />
        </div>
      </article>
    </div>
  );
}

export default function EditPostRoute({ params }: EditPostRouteProps) {
  return (
    <div className="flex w-full max-w-3xl min-h-screen flex-col px-4 pt-20 mx-auto">
      <Suspense fallback={<EditPostSkeleton />}>
        <EditPostContent params={params} />
      </Suspense>
    </div>
  );
}
