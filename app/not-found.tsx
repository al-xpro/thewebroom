import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { AuroraText } from "@/components/ui/aurora-text";

// Next.js already sends `noindex` with every 404.
export const metadata: Metadata = {
  title: "Page not found — The Web Room",
};

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-medium text-primary uppercase tracking-[0.18em]">Page not found</p>

      <h1 className="mt-4 text-[7rem] leading-none font-extrabold tracking-tighter sm:text-[10rem]">
        <AuroraText>404</AuroraText>
      </h1>

      <p className="mt-6 max-w-md text-lg text-paragraph leading-relaxed text-balance">
        This page has left the room. It may have moved, been unpublished, or never existed.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link href="/posts" className={buttonVariants({ className: "gap-2" })}>
          Browse posts
          <ArrowRight className="size-4" />
        </Link>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back home
        </Link>
      </div>
    </div>
  );
}
