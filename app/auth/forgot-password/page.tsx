"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import z from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const requestPasswordReset = useMutation(api.passwordReset.requestPasswordReset);

  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    try {
      await requestPasswordReset({ email: values.email });
      setSubmittedEmail(values.email);
      setSubmitted(true);
      showSuccessToast("Check your email for the password reset code");
    } catch (error) {
      showErrorToast(error instanceof Error ? error.message : "Failed to send reset email");
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
            <CardTitle>Check Your Email</CardTitle>
            <CardDescription>
              We've sent a password reset code to{" "}
              <span className="font-semibold text-foreground">{submittedEmail}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                We've sent you a 6-digit code. If you don't see it, please check your spam folder.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">The code will expire in 15 minutes.</p>
              <Link
                href={`/reset-password?email=${encodeURIComponent(submittedEmail)}`}
                className={buttonVariants({ className: "w-full" })}
              >
                Enter Reset Code
              </Link>
            </div>
            <div className="text-center">
              <Link href="/auth/login" className="text-sm text-primary hover:underline">
                Back to login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col w-full h-full items-center justify-center gap-8">
      {/* Back button */}
      <Link
        href="/"
        className="relative flex w-full items-start sm:absolute left-0 sm:left-6 top-0 lg:top-6 z-20"
      >
        <Button variant="secondary" size="sm" className="cursor-pointer">
          <ArrowLeft className="h-4 w-4" />
          Home
        </Button>
      </Link>
      <form className="flex flex-col w-full max-w-md gap-6" onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Reset Password</h1>
            <p className="text-muted-foreground text-sm text-paragraph text-balance">
              Enter your email address and we'll send you a code to reset your password.
            </p>
          </div>
          <Field>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel>Email Address</FieldLabel>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    aria-invalid={fieldState.invalid}
                    {...field}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </Field>
          <Field>
            <Button disabled={form.formState.isSubmitting} size="lg" className="w-full">
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                "Send Reset Code"
              )}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
