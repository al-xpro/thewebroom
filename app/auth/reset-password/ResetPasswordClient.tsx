"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { buttonVariants, Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import z from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/[0-9]/, "Password must contain a number"),
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
  const [visibleErrors, setVisibleErrors] = useState<Partial<Record<ResetPasswordFields, string>>>({});

  const resetPassword = useMutation(api.passwordReset.resetPassword);
  const resetSessionValidation = useQuery(
    api.passwordReset.validateResetSession,
    resetToken ? { resetToken } : "skip"
  );

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

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
      await resetPassword({
        resetToken,
        newPassword: values.newPassword,
      });

      setIsSuccess(true);
      showSuccessToast("Password updated successfully.");

      setTimeout(() => {
        router.push("/auth/login");
      }, 1500);
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!resetToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/50 px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Invalid Reset Link</CardTitle>
            <CardDescription>
              This page is only available after OTP verification in the forgot password flow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/forgot-password" className={buttonVariants({ className: "w-full" })}>
              Restart Password Reset
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (resetSessionValidation && !resetSessionValidation.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/50 px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Reset Session Expired</CardTitle>
            <CardDescription>
              Your reset session is no longer valid. Request a new OTP to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/forgot-password" className={buttonVariants({ className: "w-full" })}>
              Request New OTP
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/50 px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader className="space-y-4">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
            <CardTitle>Password Reset Successfully</CardTitle>
            <CardDescription>
              Your password has been changed. Redirecting you to login.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/login" className={buttonVariants({ className: "w-full" })}>
              Go to Login
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <Link href="/auth/forgot-password" className={buttonVariants({ variant: "ghost", className: "-ml-2 w-fit" })}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
          <CardTitle>Create a new password</CardTitle>
          <CardDescription>Use a strong password and avoid reusing old credentials.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4">
            <FieldGroup>
              <Controller
                name="newPassword"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>New Password</FieldLabel>
                    <Input
                      type="password"
                      placeholder="••••••••"
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
                    <FieldLabel>Confirm Password</FieldLabel>
                    <Input
                      type="password"
                      placeholder="••••••••"
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
            </FieldGroup>

            <Button disabled={isSubmitting || resetSessionValidation === undefined} size="lg" className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>

            <div className="text-center">
              <Link href="/auth/login" className="text-sm text-primary hover:underline">
                Back to login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
