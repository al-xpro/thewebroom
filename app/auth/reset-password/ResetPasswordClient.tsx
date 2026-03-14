"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { buttonVariants, Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, CheckCircle2, CheckCircle } from "lucide-react";
import z from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(20, "Password must be at most 20 characters")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/[0-9]/, "Password must contain a number")
      .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, "Password must contain a special character"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFields = keyof z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetToken = (searchParams.get("token") ?? "").trim();

  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redirectedForInvalidSession, setRedirectedForInvalidSession] = useState(false);
  const [visibleErrors, setVisibleErrors] = useState<Partial<Record<ResetPasswordFields, string>>>(
    {}
  );

  const resetPassword = useMutation(api.passwordReset.resetPassword);
  const resetSessionValidation = useQuery(
    api.passwordReset.validateResetSession,
    resetToken ? { resetToken } : "skip"
  );

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (resetToken) return;
    router.replace("/auth/forgot-password");
  }, [resetToken, router]);

  useEffect(() => {
    // if the password was already reset successfully, the session will
    // be deleted server-side and validateResetSession will return { valid: false }.
    // Don't treat that as an error — the success state already shows.
    if (isSuccess) return;
    if (!resetSessionValidation || resetSessionValidation.valid || redirectedForInvalidSession)
      return;

    setRedirectedForInvalidSession(true);
    showErrorToast("Reset session expired. Please request a new OTP.");
    router.replace("/auth/forgot-password");
  }, [isSuccess, redirectedForInvalidSession, resetSessionValidation, router]);

  const clearError = (field: ResetPasswordFields) => {
    setVisibleErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  function onInvalid(fieldErrors: typeof form.formState.errors) {
    const messages: Partial<Record<ResetPasswordFields, string>> = {};
    for (const key in fieldErrors) {
      if (key === "root") continue;
      const field = key as ResetPasswordFields;
      const error = fieldErrors[field];
      if (error && "message" in error && typeof error.message === "string") {
        messages[field] = error.message;
      }
    }
    setVisibleErrors(messages);
  }

  async function onSubmit(values: z.infer<typeof resetPasswordSchema>) {
    setIsSubmitting(true);
    try {
      await resetPassword({ resetToken, newPassword: values.newPassword });
      // Set success BEFORE the query re-fires to prevent the expired toast
      setIsSuccess(true);
      showSuccessToast("Password updated successfully.");
      setTimeout(() => router.push("/auth/login"), 1500);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!resetToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-paragraph" />
      </div>
    );
  }

  // Only show spinner while we're waiting for the initial session check
  // (undefined = still loading). Once valid=false + not success → redirect handled above.
  if (resetSessionValidation === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-paragraph" />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-5 text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-primary" />
          <h1 className="text-2xl font-bold text-primary-foreground">Password Reset Success</h1>
          <p className="text-paragraph text-balance">
            Your password has been successfully reset. You can now log in with your new password.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col w-full h-full items-center justify-center gap-8">
      <Link href="/auth/forgot-password">
        <Button variant="outline" size="sm" className="flex px-2 py-1 items-center cursor-pointer">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </Link>
      <form
        className="flex flex-col w-full max-w-md gap-6"
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
      >
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Reset your password</h1>
            <p className="text-paragraph text-sm">Enter a new password for your account.</p>
          </div>
          <Controller
            name="newPassword"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="new-password">New Password</FieldLabel>
                <Input
                  type="password"
                  id="new-password"
                  placeholder="********"
                  aria-invalid={!!visibleErrors.newPassword}
                  autoComplete="new-password"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    clearError("newPassword");
                    clearError("confirmPassword");
                  }}
                />
                {visibleErrors.newPassword && (
                  <FieldError errors={[{ message: visibleErrors.newPassword }]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="confirmPassword"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                <Input
                  type="password"
                  id="confirm-password"
                  placeholder="********"
                  autoComplete="new-password"
                  aria-invalid={!!visibleErrors.confirmPassword}
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    clearError("confirmPassword");
                  }}
                />
                {visibleErrors.confirmPassword && (
                  <FieldError errors={[{ message: visibleErrors.confirmPassword }]} />
                )}
              </Field>
            )}
          />
          <Field>
            <Button
              disabled={isSubmitting || !resetSessionValidation?.valid}
              size="lg"
              className="w-full"
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              <span>Reset Password</span>
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
