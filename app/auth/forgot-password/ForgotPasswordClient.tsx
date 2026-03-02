"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
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

const otpStepSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
});

type EmailStepFields = keyof z.infer<typeof emailStepSchema>;
type OtpStepFields = keyof z.infer<typeof otpStepSchema>;

export default function ForgotPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const linkEmail = (searchParams.get("email") ?? "").trim().toLowerCase();
  const linkOtp = (searchParams.get("otp") ?? "").trim();
  const hasOtpLink = useMemo(() => linkEmail.length > 0 && linkOtp.length > 0, [linkEmail, linkOtp]);

  const [requestedEmail, setRequestedEmail] = useState<string | null>(linkEmail || null);
  const [emailErrors, setEmailErrors] = useState<Partial<Record<EmailStepFields, string>>>({});
  const [otpErrors, setOtpErrors] = useState<Partial<Record<OtpStepFields, string>>>({});
  const [otpValue, setOtpValue] = useState(linkOtp);
  const [resendCooldownMs, setResendCooldownMs] = useState(0);

  const resendTargetEmail = hasOtpLink ? linkEmail : requestedEmail;

  const requestPasswordReset = useMutation(api.passwordReset.requestPasswordReset);
  const verifyOTPAndCreateSession = useMutation(api.passwordReset.verifyOTPAndCreateSession);

  const emailForm = useForm<z.infer<typeof emailStepSchema>>({
    resolver: zodResolver(emailStepSchema),
    defaultValues: { email: "" },
  });

  const otpForm = useForm<z.infer<typeof otpStepSchema>>({
    resolver: zodResolver(otpStepSchema),
    defaultValues: { otp: linkOtp },
  });

  const otpVerification = useQuery(
    api.passwordReset.verifyOTP,
    hasOtpLink && otpValue.length === 6 ? { email: linkEmail, otp: otpValue } : "skip"
  );

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

  const clearOtpError = (field: OtpStepFields) => {
    setOtpErrors((prev) => {
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

  function onOtpInvalid(fieldErrors: typeof otpForm.formState.errors) {
    const messages: Partial<Record<OtpStepFields, string>> = {};
    for (const key in fieldErrors) {
      if (key === "root") continue;
      const field = key as OtpStepFields;
      const error = fieldErrors[field];
      if (error && "message" in error && typeof error.message === "string") {
        messages[field] = error.message;
      }
    }
    setOtpErrors(messages);
  }

  async function onRequestOtp(values: z.infer<typeof emailStepSchema>) {
    try {
      const email = values.email.trim().toLowerCase();
      const result = await requestPasswordReset({ email });
      setRequestedEmail(email);
      setResendCooldownMs(Math.max(0, result.cooldownMsRemaining ?? 0));

      if (result.rateLimited) {
        showSuccessToast(
          `If the account exists, wait ${Math.ceil((result.cooldownMsRemaining ?? 0) / 1000)}s before requesting a new OTP.`
        );
        return;
      }

      showSuccessToast("If this email exists, a reset OTP link has been sent.");
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "Failed to send reset email");
    }
  }

  async function onResendOtp() {
    if (!resendTargetEmail || resendCooldownMs > 0) return;

    try {
      const result = await requestPasswordReset({ email: resendTargetEmail });
      setResendCooldownMs(Math.max(0, result.cooldownMsRemaining ?? 0));

      if (result.rateLimited) {
        showSuccessToast(
          `If the account exists, wait ${Math.ceil((result.cooldownMsRemaining ?? 0) / 1000)}s before requesting a new OTP.`
        );
        return;
      }

      showSuccessToast("If this email exists, a new reset OTP link has been sent.");
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "Failed to resend OTP");
    }
  }

  async function onVerifyOtp(values: z.infer<typeof otpStepSchema>) {
    try {
      const result = await verifyOTPAndCreateSession({
        email: linkEmail,
        otp: values.otp,
      });

      if (!result?.resetToken) {
        showErrorToast("Failed to create reset session");
        return;
      }

      showSuccessToast("OTP verified. You can now set a new password.");
      router.push(`/auth/reset-password?token=${encodeURIComponent(result.resetToken)}`);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "Invalid OTP");
    }
  }

  return (
    <div className="relative flex flex-col w-full h-full items-center justify-center gap-8">
      <Link href="/" className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="relative flex px-2 py-1 items-center left-0 top-0 z-20 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Button>
      </Link>

      <div className="flex flex-col w-full max-w-md gap-6">
        <form className="flex flex-col gap-6" onSubmit={emailForm.handleSubmit(onRequestOtp, onEmailInvalid)}>
          <FieldGroup>
            <div className="flex flex-col items-center gap-1 text-center">
              <h1 className="text-2xl font-bold">Forgot your password?</h1>
              <p className="text-paragraph text-sm text-balance">
                Enter your account email and we&apos;ll send you a secure OTP link.
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
                    onChange={(e) => { field.onChange(e); clearEmailError("email"); }}
                  />
                  {emailErrors.email && <FieldError errors={[{ message: emailErrors.email }]} />}
                </Field>
              )}
            />

            <Button disabled={emailForm.formState.isSubmitting} size="lg" className="w-full">
              {emailForm.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
              <span>Send OTP Link</span>
            </Button>
          </FieldGroup>
        </form>

        {requestedEmail && !hasOtpLink && (
          <div className="rounded-lg border p-4 text-sm text-paragraph bg-muted/50">
            If the account exists, we sent an email to{" "}
            <span className="font-semibold">{requestedEmail}</span>.
            Open the secure link in that email to continue and unlock OTP verification on this page.
          </div>
        )}

        {hasOtpLink && (
          <form className="flex flex-col gap-4" onSubmit={otpForm.handleSubmit(onVerifyOtp, onOtpInvalid)}>
            <FieldGroup>
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold">Verify OTP</h2>
                <p className="text-sm text-paragraph">
                  We detected a secure reset link for{" "}
                  <span className="font-semibold">{linkEmail}</span>.
                </p>
              </div>

              <Controller
                name="otp"
                control={otpForm.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="otp">One-Time Code</FieldLabel>
                    <Input
                      id="otp"
                      maxLength={6}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      aria-invalid={!!otpErrors.otp}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setOtpValue(e.target.value);
                        clearOtpError("otp");
                      }}
                    />
                    {otpErrors.otp && <FieldError errors={[{ message: otpErrors.otp }]} />}
                    {otpValue.length === 6 && otpVerification?.valid === false && (
                      <p className="text-sm text-destructive mt-1">{otpVerification.error}</p>
                    )}
                  </Field>
                )}
              />

              <Button disabled={otpForm.formState.isSubmitting} size="lg" className="w-full">
                {otpForm.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
                <span>Verify OTP</span>
              </Button>
            </FieldGroup>
          </form>
        )}

        {resendTargetEmail && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-paragraph text-center">
              Didn&apos;t receive the email? Request another OTP link for{" "}
              <span className="font-semibold">{resendTargetEmail}</span>.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={onResendOtp}
              disabled={resendCooldownMs > 0 || emailForm.formState.isSubmitting}
            >
              {resendCooldownMs > 0
                ? `Resend available in ${Math.ceil(resendCooldownMs / 1000)}s`
                : "Resend OTP Link"}
            </Button>
          </div>
        )}

        <div className="text-center">
          <Link href="/auth/login" className="text-sm text-primary hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
