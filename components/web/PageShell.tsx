import { Suspense, type ReactNode } from "react";
import Footer from "@/components/web/Footer";

// The column every content page sits in, with the footer below.
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col pt-20 max-w-3xl mx-auto px-4">
      {children}
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
}
