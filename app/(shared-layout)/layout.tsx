import { DockNavigation } from "@/components/web/DockNavigation";
import { ReactNode, Suspense } from "react";

export default function SharedLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <DockNavigation />
      </Suspense>
      {children}
    </>
  );
}
