"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";
import { Mail, CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function EmailVerificationClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useQuery(api.auth.getCurrentUser);

  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const token = searchParams.get("token");
  const error = searchParams.get("error");
  const emailParam = searchParams.get("email");

  const sendVerificationMutation = useMutation(api.auth.sendVerificationEmail);
  const verifyEmailMutation = useMutation(api.auth.verifyEmail);
  const verifiedRef = useRef<string | null>(null);

  // Guard: block direct URL access — page is only valid with a token (email
  // link click) or an email param (just redirected from signup).
  // If neither is present, the user typed the URL manually → send to sign-up.
  useEffect(() => {
    if (token || emailParam || error) return;
    // Wait one tick so searchParams hydrate before redirecting
    const id = setTimeout(() => {
      router.replace("/auth/sign-up");
    }, 0);
    return () => clearTimeout(id);
  }, [token, emailParam, error, router]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Handle token in URL — fires once per unique token, never loops
  useEffect(() => {
    if (!token || error) return;
    if (verifiedRef.current === token) return;

    verifiedRef.current = token;
    setIsVerifying(true);

    verifyEmailMutation({ token })
      .then((result) => {
        if (result.verified || result.already) {
          setShowSuccess(true);
          setTimeout(() => {
            router.push("/auth/login?verified=1");
          }, 1000);
        }
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Verification failed";
        setTokenError(msg);
        showErrorToast(msg);
      })
      .finally(() => {
        setIsVerifying(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, error]);

  // If user is already verified and onboarded, send them home
  useEffect(() => {
    if (!user || token) return;
    if (user.emailVerified && user.onboardingCompleted) {
      router.replace("/");
    } else if (user.emailVerified) {
      router.replace("/onboarding/complete-profile?force=1");
    }
  }, [user, token, router]);

  const displayEmail = user?.email ?? emailParam ?? "your email";

  const handleResendEmail = async () => {
    if (resendCount >= 2) {
      showErrorToast("Maximum resend attempts reached. Please check your spam folder.");
      return;
    }

    const email = user?.email ?? emailParam;
    if (!email) {
      showErrorToast("Email address not found. Please sign up again.");
      return;
    }

    setIsResending(true);
    try {
      const result = await sendVerificationMutation({ email });
      if (result.sent) {
        setResendCount((c) => c + 1);
        setCooldown(30);
        showSuccessToast("Verification email sent!");
      } else {
        showErrorToast("Failed to send verification email. Please try again.");
      }
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : "Failed to resend verification email");
    } finally {
      setIsResending(false);
    }
  };

  // Don't render anything while the guard redirect is pending
  if (!token && !emailParam && !error) {
    return null;
  }

  if (isVerifying) {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-paragraph">Verifying your email...</p>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="relative flex flex-col w-full h-full items-center justify-center gap-8">
        <Link href="/auth/sign-up">
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Signup
          </Button>
        </Link>
        <div className="flex flex-col items-center gap-5 text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-primary" />
          <h1 className="text-2xl font-bold">Email Verified!</h1>
          <p className="text-paragraph text-balance">
            Your email has been verified. Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  if (error || tokenError) {
    return (
      <div className="relative flex flex-col w-full h-full items-center justify-center gap-8">
        <Link href="/auth/sign-up">
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Signup
          </Button>
        </Link>
        <div className="flex flex-col items-center gap-10 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
            <span className="text-3xl text-white">✕</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Verification Failed</h1>
            <p className="text-paragraph text-balance">
              {tokenError ??
                (error === "expired"
                  ? "This verification link has expired. Please request a new one."
                  : "Invalid verification link. Please check your email and try again.")}
            </p>
          </div>
          <Link href="/auth/sign-up">
            <Button variant="outline" size="sm">Back to Signup</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Waiting room — shown after signup redirect with ?email= param
  return (
    <div className="relative flex flex-col w-full h-full items-center justify-center gap-8">
      <Link href="/auth/sign-up">
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Signup
        </Button>
      </Link>
      <div className="flex flex-col items-center gap-5 text-center max-w-md">
        <Mail className="w-16 h-16 text-primary" />
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Verify Your Email</h1>
          <p className="text-paragraph text-sm">
            We sent a verification link to{" "}
            <span className="font-medium">{displayEmail}</span>
          </p>
        </div>
        <div className="bg-[#EDEDED] dark:bg-[#0A0A0A] rounded-lg p-4 text-sm text-paragraph">
          Click the link in your email to verify your address. The link expires in 15 minutes.
        </div>
        <div className="space-y-3 w-full">
          <p className="text-sm text-paragraph">Didn&apos;t receive the email?</p>
          <Button
            onClick={handleResendEmail}
            disabled={isResending || cooldown > 0 || resendCount >= 2}
            variant="outline"
            className="w-full"
          >
            {isResending
              ? "Sending..."
              : cooldown > 0
                ? `Resend in ${cooldown}s`
                : resendCount >= 2
                  ? "Max resends reached"
                  : `Resend Email${resendCount > 0 ? ` (${resendCount}/2)` : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
}