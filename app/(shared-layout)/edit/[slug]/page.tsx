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
      {/* Top action bar: "My Posts" on left, dual "Save" buttons on right */}
      <div className="flex items-center justify-between gap-5">
        {/* Back Button */}
        <Skeleton className="h-9 w-28 rounded-md" />

        {/* Save Draft & Save Publish Buttons */}
        <div className="flex flex-wrap items-end justify-end gap-2">
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      </div>

      <article className="flex flex-col gap-11">
        <header className="flex flex-col gap-4">
          {/* Title - Matches text-3xl/4xl height */}
          <div className="space-y-2">
            <Skeleton className="h-10 w-3/4 sm:w-2/3" />
          </div>

          {/* Subtitle - Matches text-lg height */}
          <div className="space-y-2">
            <Skeleton className="h-[30px] w-full" />
          </div>

          <Separator className="my-4" />

          {/* Meta Row - Matches sm:gap-14 */}
          <div className="flex flex-wrap items-center justify-between sm:gap-14">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
            {/* Copy Slug (Hidden on mobile) */}
            <div className="hidden sm:flex flex-col items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-sm" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        </header>

        {/* Image Preview Area - Matches h-[280px]/[380px] */}
        <div className="relative h-[280px] w-full overflow-hidden rounded-md border border-[#EAEAEA] dark:border-[#1E1E1E] sm:h-[380px]">
          <Skeleton className="h-full w-full" />
        </div>

        {/* Editor Content Area */}
        <div className="flex flex-col gap-4 pt-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-11/12" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-[250px] w-full rounded-md mt-4" />
        </div>
      </article>

      {/* Fixed Toolbar Placeholder - Bulked up with more buttons for the new editor */}
      <div className="fixed bottom-0 left-0 w-full z-50 border-t border-[#EAEAEA] dark:border-[#1E1E1E] bg-[#EDEDED] dark:bg-[#0A0A0A]">
        <div className="flex items-center gap-3 px-4 py-2 w-max mx-auto h-[45px]">
          {/* Simulating a rich text editor toolbar with distinct groups */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map((i) => (
            <div key={i} className="flex gap-1.5 items-center">
              <Skeleton className="h-8 w-8 rounded-md bg-black/10 dark:bg-white/10" />
              {/* Add dividers between logical groupings */}
              {(i === 2 || i === 7 || i === 11 || i === 13 || i === 17 || i === 20) && (
                <div className="h-5 w-px bg-gray-300 dark:bg-gray-800 mx-1" />
              )}
            </div>
          ))}

          <div className="flex gap-1.5 items-center">
            <Skeleton className="h-3 w-14 rounded-md bg-black/10 dark:bg-white/10" />
          </div>
        </div>
      </div>
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
