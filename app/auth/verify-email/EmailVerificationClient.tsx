"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";
import { Mail, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

const RESEND_COOLDOWN_SECONDS = 30;
const MAX_RESENDS = 2;

// better-auth redirects here with `?error=<code>` when a verification link fails.
const LINK_ERRORS: Record<string, string> = {
  TOKEN_EXPIRED: "This verification link has expired.",
  INVALID_TOKEN: "This verification link isn't valid.",
  USER_NOT_FOUND: "No account matches this verification link.",
};

export default function EmailVerificationClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);

  const verified = searchParams.get("verified") === "1";
  const error = searchParams.get("error");
  const email = searchParams.get("email");
  // Links sent before #65 carry `?token=` and point at the old verification flow.
  const legacyToken = searchParams.get("token");

  const hasState = verified || error || email || legacyToken;

  // Without a link or an address there's nothing to show: send people to sign-up.
  useEffect(() => {
    if (hasState) return;
    const id = setTimeout(() => router.replace("/auth/sign-up"), 0);
    return () => clearTimeout(id);
  }, [hasState, router]);

  // The link signed the member in; post-auth sends them to onboarding (or home).
  useEffect(() => {
    if (!verified || error) return;
    const id = setTimeout(() => router.replace("/onboarding/post-auth"), 1000);
    return () => clearTimeout(id);
  }, [verified, error, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResendEmail = async () => {
    if (!email || resendCount >= MAX_RESENDS) return;

    setIsResending(true);
    const { error: resendError } = await authClient.sendVerificationEmail({
      email,
      callbackURL: `/auth/verify-email?verified=1&email=${encodeURIComponent(email)}`,
    });
    setIsResending(false);

    if (resendError) {
      showErrorToast(resendError.message || "Failed to send the verification e-mail.");
      return;
    }
    setResendCount((c) => c + 1);
    setCooldown(RESEND_COOLDOWN_SECONDS);
    showSuccessToast("Verification e-mail sent!");
  };

  const resendButton = email && (
    <Button
      onClick={handleResendEmail}
      disabled={isResending || cooldown > 0 || resendCount >= MAX_RESENDS}
      variant="outline"
      className="w-full"
    >
      {isResending
        ? "Sending..."
        : cooldown > 0
          ? `Resend in ${cooldown}s`
          : resendCount >= MAX_RESENDS
            ? "Max resends reached"
            : `Resend e-mail${resendCount > 0 ? ` (${resendCount}/${MAX_RESENDS})` : ""}`}
    </Button>
  );

  const backToSignUp = (
    <Link href="/auth/sign-up">
      <Button variant="outline" size="sm" className="flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Sign up
      </Button>
    </Link>
  );

  if (!hasState) return null;

  if (verified && !error) {
    return (
      <div className="relative flex flex-col w-full h-full items-center justify-center gap-8">
        <div className="flex flex-col items-center gap-5 text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-primary" />
          <h1 className="text-2xl font-bold">E-mail verified</h1>
          <p className="text-paragraph text-balance">You&apos;re signed in. Taking you on...</p>
        </div>
      </div>
    );
  }

  if (error || legacyToken) {
    const message = legacyToken
      ? "This link is from an earlier version of the site and no longer works."
      : (LINK_ERRORS[error ?? ""] ?? "This verification link didn't work.");
    return (
      <div className="relative flex flex-col w-full h-full items-center justify-center gap-8">
        {backToSignUp}
        <div className="flex flex-col items-center gap-6 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
            <span className="text-3xl text-white">✕</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Verification failed</h1>
            <p className="text-paragraph text-balance">{message}</p>
            <p className="text-paragraph text-sm text-balance">
              {email
                ? "Request a new link below."
                : "Sign in with your e-mail and password, and we'll send you a new link."}
            </p>
          </div>
          {resendButton ?? (
            <Link href="/auth/login" className="w-full">
              <Button variant="outline" className="w-full">
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Waiting room, right after sign-up.
  return (
    <div className="relative flex flex-col w-full h-full items-center justify-center gap-8">
      {backToSignUp}
      <div className="flex flex-col items-center gap-5 text-center max-w-md">
        <Mail className="w-16 h-16 text-primary" />
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Verify your e-mail</h1>
          <p className="text-paragraph text-sm">
            We sent a verification link to <span className="font-medium">{email}</span>
          </p>
        </div>
        <div className="bg-[#EDEDED] dark:bg-[#0A0A0A] rounded-lg p-4 text-sm text-paragraph">
          Click the link in the e-mail to verify your address and sign in. The link expires in
          1 hour.
        </div>
        <div className="space-y-3 w-full">
          <p className="text-sm text-paragraph">Didn&apos;t receive the e-mail?</p>
          {resendButton}
        </div>
      </div>
    </div>
  );
}
