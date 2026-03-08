import { Loader2 } from "lucide-react";
import CompleteProfileClient from "./CompleteProfileClient";
import { Suspense } from "react";

export default function CompleteProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="size-6 animate-spin text-paragraph" />
        </div>
      }
    >
      <CompleteProfileClient />
    </Suspense>
  );
}
