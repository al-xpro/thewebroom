import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Skeleton } from "@/components/ui/skeleton";
import { getToken } from "@/lib/auth-server";
import { CreatePostClient } from "./CreatePostClient";

async function CreatePostContent() {
  await connection();

  return <CreatePostClient />;
}

export default function CreatePostRoute() {
  return (
    <div className="flex flex-col pt-20 max-w-3xl mx-auto px-4 gap-6">
      <div className="text-left">
        <h1 className="text-4xl font-extrabold text-primary mt-6">Create Post</h1>
        <p className="text-xl text-paragraph pt-4">
          Help us grow our community by sharing your knowledge and insights.
        </p>
      </div>

      <Suspense
        fallback={
          <Skeleton className="h-full w-full rounded-md">
            <div className="relative flex w-full flex-col items-center justify-start gap-6 px-6 py-8 mx-auto">
              <div className="flex flex-col w-full gap-2">
                <div className="w-12 h-4 bg-black/80 dark:bg-white/80 rounded-md" />
                <div className="w-full h-10 bg-[#EAEAEA] dark:bg-[#1E1E1E] rounded-md" />
              </div>
              <div className="flex flex-col w-full gap-2">
                <div className="w-12 h-4 bg-black/80 dark:bg-white/80 rounded-md" />
                <div className="w-full h-10 bg-[#EAEAEA] dark:bg-[#1E1E1E] rounded-md" />
              </div>
              <div className="flex w-full gap-2">
                <div className="flex flex-col w-full gap-2">
                  <div className="w-12 h-4 bg-black/80 dark:bg-white/80 rounded-md" />
                  <div className="w-full h-10 bg-[#EAEAEA] dark:bg-[#1E1E1E] rounded-md" />
                </div>
                <div className="flex flex-col w-full gap-2">
                  <div className="w-12 h-4 bg-black/80 dark:bg-white/80 rounded-md" />
                  <div className="w-full h-10 bg-[#EAEAEA] dark:bg-[#1E1E1E] rounded-md" />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row w-full gap-2">
                <div className="flex flex-col w-full gap-2">
                  <div className="w-12 h-4 bg-black/80 dark:bg-white/80 rounded-md" />
                  <div className="w-full h-10 sm:h-[230px] bg-[#EAEAEA] dark:bg-[#1E1E1E] rounded-md" />
                </div>
                <div className="flex flex-col w-full gap-2">
                  <div className="hidden sm:flex w-12 h-4 bg-transparent rounded-md" />
                  <div className="w-full h-[220px] sm:h-[230px] bg-[#EAEAEA] dark:bg-[#1E1E1E] rounded-md" />
                </div>
              </div>
              <div className="flex flex-col w-full gap-2">
                <div className="w-12 h-4 bg-black/80 dark:bg-white/80 rounded-md" />
                <div className="w-full h-[600px] bg-[#EAEAEA] dark:bg-[#1E1E1E] rounded-md" />
              </div>
              <div className="flex flex-col w-full">
                <div className="w-full h-10 bg-primary/30 rounded-md" />
              </div>
            </div>
          </Skeleton>
        }
      >
        <CreatePostContent />
      </Suspense>
    </div>
  );
}