import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function LoadingPage() {
  return (
    <div className="flex flex-col w-full max-w-3xl min-h-screen pt-20 px-4 mx-auto">
      <div className="flex flex-col w-full items-start justify-center gap-8">
        <Skeleton className="h-8 w-24" />
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
          <div className="relative mt-5 h-[260px] w-full overflow-hidden rounded-xl shadow-sm sm:h-[340px] lg:h-[380px]">
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
      </div>
    </div>
  );
}
