import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ResetPasswordClient from "./ResetPasswordClient";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center">
          <Loader2 className="size-6 animate-spin text-paragraph" />
        </div>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  );
}