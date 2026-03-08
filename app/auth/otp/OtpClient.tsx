"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";
import ClerkOTP from "@/components/ui/otp";

function formatCooldown(ms: number) {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export default function OtpClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = (searchParams.get("email") ?? "").trim().toLowerCase();

  const verifyOTPAndCreateSession = useMutation(api.passwordReset.verifyOTPAndCreateSession);
  const requestPasswordReset = useMutation(api.passwordReset.requestPasswordReset);

  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldownMs, setResendCooldownMs] = useState(0);

  useEffect(() => {
    if (email) return;
    router.replace("/auth/forgot-password");
  }, [email, router]);

  useEffect(() => {
    if (resendCooldownMs <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldownMs((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldownMs]);

  async function handleOtpComplete(code: string) {
    if (!email || code.length !== 6) return;

    setIsSubmitting(true);
    setOtpError(null);

    try {
      const result = await verifyOTPAndCreateSession({ email, otp: code });

      if (!result?.resetToken) {
        setOtpError("Unable to verify OTP.");
        setOtpValue("");
        return;
      }

      showSuccessToast("OTP verified. You can now reset your password.");
      router.push(`/auth/reset-password?token=${encodeURIComponent(result.resetToken)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid OTP";
      setOtpError(message);
      showErrorToast(message);
      setOtpValue("");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onResendOtp() {
    if (!email || resendCooldownMs > 0 || isSubmitting) return;

    try {
      const result = await requestPasswordReset({ email });
      setResendCooldownMs(Math.max(0, result.cooldownMsRemaining ?? 0));

      if (result.rateLimited) {
        const wait = formatCooldown(result.cooldownMsRemaining ?? 0);
        if (result.dailyLimit) {
          showErrorToast(`Too many OTP requests. Try again in ${wait}.`);
        } else {
          showErrorToast(`Please wait ${wait} before requesting a new OTP.`);
        }
        return;
      }

      showSuccessToast("If this email exists, a new OTP has been sent.");
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "Failed to resend OTP");
    }
  }

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-paragraph" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col w-full h-full items-center justify-center gap-8">
      <Link href="/auth/forgot-password" className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="relative flex px-2 py-1 items-center left-0 top-0 z-20 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </Link>

      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Verify OTP</h1>
          <p className="text-sm text-paragraph">
            Enter the 6-digit code sent to <span className="font-semibold">{email}</span>.
          </p>
        </div>

        <div className="flex w-full justify-center">
          <ClerkOTP
            delay={3500}
            cardTitle="Hover to Animate"
            cardDescription="Animation only triggers when hovering over the card. Random digits generated each time."
            whileHover={true}
            value={otpValue}
            onChange={(value) => {
              setOtpValue(value);
              setOtpError(null);
            }}
            onComplete={handleOtpComplete}
            disabled={isSubmitting}
          />
        </div>

        {isSubmitting && (
          <div className="flex items-center justify-center gap-2 text-sm text-paragraph">
            <Loader2 className="size-4 animate-spin" />
            Verifying OTP...
          </div>
        )}

        {otpError && <p className="text-sm text-center text-destructive">{otpError}</p>}

        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-paragraph text-center">Didn&apos;t receive a code?</p>
          <Button
            type="button"
            variant="secondary"
            onClick={onResendOtp}
            disabled={resendCooldownMs > 0 || isSubmitting}
          >
            {resendCooldownMs > 0
              ? `Resend available in ${formatCooldown(resendCooldownMs)}`
              : "Resend OTP"}
          </Button>
        </div>
      </div>
    </div>
  );
}
