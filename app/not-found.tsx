import type { Metadata } from "next";
import Link from "next/link";

// Next.js already sends `noindex` with every 404.
export const metadata: Metadata = {
  title: "Not found — The Web Room",
};

export default function NotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <div className="space-y-3 text-center">
        <p className="type-label">404</p>
        <h1 className="type-title">Nothing here.</h1>
        <Link href="/" className="type-meta underline-offset-4 hover:underline">
          Home
        </Link>
      </div>
    </div>
  );
}
