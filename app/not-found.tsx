import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-2xl">
        <div className="space-y-2">
          <h1 className="text-7xl font-extrabold tracking-tight sm:text-8xl">
            404
          </h1>
          <p className="text-4xl font-extrabold tracking-tight md:text-5xl">
            Page not found
          </p>
        </div>
        
        <p className="md:text-xl text-paragraph leading-relaxed text-balance mx-auto">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. <br className="hidden sm:block"/>
           It might have been moved or deleted.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link href="/" className={buttonVariants({ size: "lg", variant: "outline" })}>
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
