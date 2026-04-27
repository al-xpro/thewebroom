import { Suspense } from "react";
import { connection } from "next/server";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CreatePostClient } from "./CreatePostClient";
import { fetchQuery } from "convex/nextjs";
import { getToken } from "@/lib/auth-server";
import { api } from "@/convex/_generated/api";

async function CreatePostContent() {
  await connection();

  const token = await getToken().catch(() => null);

  // Fetch the user on the server to avoid the "anonymous" flash on mount
  const currentUser = await fetchQuery(api.auth.getCurrentUser, {}, { token: token ?? undefined });

  return <CreatePostClient initialUser={currentUser} />;
}

function CreatePostSkeleton() {
  return (
    <div className="flex flex-col w-full gap-8 pb-16">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      <div className="flex flex-col gap-4">
        <Skeleton className="h-11 w-3/4 sm:w-1/2" />
        <Skeleton className="h-20 w-full" />
        <Separator className="my-4" />
        <div className="flex flex-wrap items-start justify-between gap-6 sm:gap-10">
          <Skeleton className="h-16 w-[170px] rounded-xl" />
          <Skeleton className="h-16 w-[150px] rounded-xl" />
          <Skeleton className="h-16 w-[150px] rounded-xl" />
        </div>
      </div>

      <Skeleton className="h-[280px] w-full rounded-xl sm:h-[380px]" />
      <Skeleton className="h-[580px] w-full rounded-xl" />
    </div>
  );
}

export default function CreatePostRoute() {
  return (
    <div className="flex w-full max-w-3xl min-h-screen flex-col px-4 pt-20 mx-auto">
      <Suspense fallback={<CreatePostSkeleton />}>
        <CreatePostContent />
      </Suspense>
    </div>
  );
}
