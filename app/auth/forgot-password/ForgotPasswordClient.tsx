"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft } from "lucide-react";
import z from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";
import { useRouter, useSearchParams } from "next/navigation";

const emailStepSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type EmailStepFields = keyof z.infer<typeof emailStepSchema>;

function formatCooldown(ms: number) {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export default function ForgotPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const prefilledEmail = (searchParams.get("email") ?? "").trim().toLowerCase();

  const [requestedEmail, setRequestedEmail] = useState<string | null>(prefilledEmail || null);
  const [emailErrors, setEmailErrors] = useState<Partial<Record<EmailStepFields, string>>>({});
  const [resendCooldownMs, setResendCooldownMs] = useState(0);

  const requestPasswordReset = useMutation(api.passwordReset.requestPasswordReset);

  const emailForm = useForm<z.infer<typeof emailStepSchema>>({
    resolver: zodResolver(emailStepSchema),
    defaultValues: { email: prefilledEmail },
  });

  useEffect(() => {
    if (!prefilledEmail) return;
    emailForm.setValue("email", prefilledEmail);
  }, [emailForm, prefilledEmail]);

  useEffect(() => {
    if (resendCooldownMs <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldownMs((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldownMs]);

  const clearEmailError = (field: EmailStepFields) => {
    setEmailErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  function onEmailInvalid(fieldErrors: typeof emailForm.formState.errors) {
    const messages: Partial<Record<EmailStepFields, string>> = {};
    for (const key in fieldErrors) {
      if (key === "root") continue;
      const field = key as EmailStepFields;
      const error = fieldErrors[field];
      if (error && "message" in error && typeof error.message === "string") {
        messages[field] = error.message;
      }
    }
    setEmailErrors(messages);
  }

  async function onRequestOtp(values: z.infer<typeof emailStepSchema>) {
    try {
      const email = values.email.trim().toLowerCase();
      const result = await requestPasswordReset({ email });

      setRequestedEmail(email);
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

      showSuccessToast("If this email exists, we sent an OTP to continue reset.");
      router.push(`/auth/otp?email=${encodeURIComponent(email)}`);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "Failed to send reset email");
    }
  }

  async function onResendOtp() {
    if (!requestedEmail || resendCooldownMs > 0) return;

    try {
      const result = await requestPasswordReset({ email: requestedEmail });
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

  return (
    <div className="relative flex flex-col w-full h-full items-center justify-center gap-8">
      <Link href="/auth/login" className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="relative flex px-2 py-1 items-center left-0 top-0 z-20 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Login
        </Button>
      </Link>

      <div className="flex flex-col w-full max-w-md gap-6">
        <form className="flex flex-col gap-6" onSubmit={emailForm.handleSubmit(onRequestOtp, onEmailInvalid)}>
          <FieldGroup>
            <div className="flex flex-col items-center gap-1 text-center">
              <h1 className="text-2xl font-bold">Forgot your password?</h1>
              <p className="text-paragraph text-sm text-balance">
                Enter your account email and we&apos;ll send a one-time code.
              </p>
            </div>

            <Controller
              name="email"
              control={emailForm.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="email">Email Address</FieldLabel>
                  <Input
                    type="email"
                    id="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                    aria-invalid={!!emailErrors.email}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      clearEmailError("email");
                    }}
                  />
                  {emailErrors.email && <FieldError errors={[{ message: emailErrors.email }]} />}
                </Field>
              )}
            />

            <Button disabled={emailForm.formState.isSubmitting} size="lg" className="w-full">
              {emailForm.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
              <span>Send OTP</span>
            </Button>
          </FieldGroup>
        </form>

        {requestedEmail && (
          <div className="rounded-lg border p-4 text-sm text-paragraph bg-muted/50">
            If the account exists, we sent an OTP to <span className="font-semibold">{requestedEmail}</span>.
            Continue on the OTP verification page.
          </div>
        )}

        {requestedEmail && (
          <div className="flex flex-col items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onResendOtp}
              disabled={resendCooldownMs > 0 || emailForm.formState.isSubmitting}
            >
              {resendCooldownMs > 0
                ? `Resend available in ${formatCooldown(resendCooldownMs)}`
                : "Resend OTP"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
