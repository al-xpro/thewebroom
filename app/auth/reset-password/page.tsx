"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import z from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";

const resetPasswordSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [isSuccess, setIsSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpValue, setOtpValue] = useState("");

  const resetPassword = useMutation(api.passwordReset.resetPassword);
  
  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      otp: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const otpValid = email && otpValue.length === 6
    ? useQuery(api.passwordReset.verifyOTP, { email, otp: otpValue })
    : null;

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/50 px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Missing Email</CardTitle>
            <CardDescription>
              Please start the password reset process from the login page.
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

  async function onSubmit(values: z.infer<typeof resetPasswordSchema>) {
    setIsVerifying(true);
    try {
      // In a real app, this would update the password in the database
      // For now, we're just verifying the OTP
      await resetPassword({
        email,
        otp: values.otp,
        newPassword: values.newPassword,
      });
      
      setIsSuccess(true);
      showSuccessToast("Password reset successfully!");
      
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
    } catch (error) {
      showErrorToast(
        error instanceof Error ? error.message : "Failed to reset password"
      );
    } finally {
      setIsVerifying(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/50 px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader className="space-y-4">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
            <CardTitle>Password Reset Successfully</CardTitle>
            <CardDescription>
              Your password has been changed. You can now log in with your new password.
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
          <CardTitle>Enter Reset Code</CardTitle>
          <CardDescription>
            We've sent a code to <span className="font-semibold text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FieldGroup>
              <Controller
                name="otp"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>Reset Code</FieldLabel>
                    <Input
                      placeholder="000000"
                      maxLength={6}
                      inputMode="numeric"
                      aria-invalid={fieldState.invalid}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setOtpValue(e.target.value);
                      }}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                    {otpValid?.valid === false && (
                      <p className="text-sm text-destructive mt-1">{otpValid.error}</p>
                    )}
                  </Field>
                )}
              />

              <Controller
                name="newPassword"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>New Password</FieldLabel>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      aria-invalid={fieldState.invalid}
                      {...field}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="confirmPassword"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>Confirm Password</FieldLabel>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      aria-invalid={fieldState.invalid}
                      {...field}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>

            <Button 
              disabled={isVerifying || !form.formState.isValid} 
              size="lg" 
              className="w-full"
            >
              {isVerifying ? (
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
