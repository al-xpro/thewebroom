import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Pen, Terminal } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DockNavigation } from "@/components/web/DockNavigation";
import { MissingPath } from "@/components/web/MissingPath";

// Next.js already sends `noindex` with every 404.
export const metadata: Metadata = {
  title: "Page not found — The Web Room",
};

export default function NotFound() {
  return (
    <>
      <Suspense fallback={null}>
        <DockNavigation />
      </Suspense>

      <div className="flex min-h-screen flex-col justify-center max-w-3xl mx-auto px-4 pt-20 pb-16">
        <section className="flex flex-col gap-8">
          <div className="space-y-4">
            <p className="text-sm font-medium text-primary uppercase tracking-[0.18em]">Error 404</p>
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl text-balance">
              This page isn&apos;t in the room.
            </h1>
            <p className="text-lg text-paragraph leading-relaxed text-balance">
              It may have moved, been unpublished, or never existed. The posts are still where you
              left them.
            </p>
          </div>

          <div className="rounded-lg overflow-hidden border border-[#EAEAEA] dark:border-[#1E1E1E]">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-[#EAEAEA] dark:border-[#1E1E1E] bg-[#FAFAFA] dark:bg-black select-none">
              <Terminal className="size-4 text-neutral-500" />
              <span className="text-xs font-mono text-paragraph">terminal</span>
            </div>
            <div className="bg-white dark:bg-[#0A0A0A] p-4 font-mono text-[13px] leading-[20px] overflow-x-auto">
              <div className="whitespace-pre min-w-max">
                <p>
                  <span className="text-paragraph select-none">$ </span>
                  curl -I thewebroom.alxpro.com
                  <Suspense fallback="/…">
                    <MissingPath />
                  </Suspense>
                </p>
                <p className="text-primary font-semibold">HTTP/2 404</p>
                <p className="text-paragraph">content-type: text/html; charset=utf-8</p>
                <p className="text-paragraph">x-suggestion: try /posts</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/posts" className={buttonVariants({ className: "gap-2" })}>
              Browse posts
              <ArrowRight className="size-4" />
            </Link>
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Back home
            </Link>
            <Link href="/create" className={buttonVariants({ variant: "ghost", className: "gap-2" })}>
              <Pen className="size-4" />
              Write a post
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
