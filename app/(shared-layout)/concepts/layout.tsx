import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import Footer from "@/components/web/Footer";

export const metadata: Metadata = {
  title: "Concepts — The Web Room",
  robots: { index: false, follow: false },
};

// Design concepts with made-up data: how upcoming features could look and feel.
export default function ConceptsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col pt-20 max-w-3xl mx-auto px-4">
      <div className="flex items-center justify-between pt-6">
        <Link href="/concepts" className="type-label hover:text-black dark:hover:text-white">
          Concept
        </Link>
        <span className="type-meta text-xs">Made-up data</span>
      </div>
      {children}
      <Footer />
    </div>
  );
}
