import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ProfileClient from "./ProfileClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="size-6 animate-spin text-paragraph" />
        </div>
      }
    >
      <ProfileClient />
    </Suspense>
  );
}