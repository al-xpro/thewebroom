import { Suspense } from "react";
import EmailVerificationClient from "./EmailVerificationClient";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Verify Email — The Web Room",
  description: "Verify your email address to complete your account setup",
};

function Loading() {
  return (
    <div className="flex items-center justify-center">
      <Loader2 className="size-6 animate-spin text-paragraph" />
    </div>
  );
}

export default function EmailVerificationPage() {
  return (
    <div className="flex items-center justify-center px-4">
      <Suspense fallback={<Loading />}>
        <EmailVerificationClient />
      </Suspense>
    </div>
  );
}
