import { DockNavigation } from "@/components/web/DockNavigation";
import RequireCompleteProfile from "@/components/web/RequireCompleteProfile";
import { ReactNode, Suspense } from "react";

export default function SharedLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <DockNavigation />
        <RequireCompleteProfile />
      </Suspense>
      {children}
    </>
  );
}
