import { ReactNode } from "react";
import { AuthSidePanel } from "@/components/web/AuthSidePanel";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen relative flex w-full">
      <AuthSidePanel />
      <div className="relative flex w-full lg:w-1/2 items-center justify-center p-6">
        {children}
      </div>
    </div>
  );
}
