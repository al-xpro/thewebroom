"use client";

import { signUpSchema } from "@/app/schemas/auth";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { createPendingName } from "@/lib/onboarding";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";

type SignUpFields = keyof z.infer<typeof signUpSchema>;

async function getClientIpAddress(): Promise<string> {
  try {
    const response = await fetch("https://api.ipify.org?format=json", {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (response.ok) {
      const data = await response.json();
      return data.ip || "unknown";
    }
  } catch {
    // IP service may be unavailable or blocked
  }
  return "unknown";
}

export default function SignUpClient() {
  const [isPending, startTransition] = useTransition();
  const [visibleErrors, setVisibleErrors] = useState<Partial<Record<SignUpFields, string>>>({});
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const authProviderStatus = useQuery(api.auth.getAuthProviderStatus);
  const assertEmailNotBanned = useMutation(api.auth.assertEmailNotBanned);
  // Uses the new server-side token generation — only needs email
  const sendVerificationEmail = useMutation(api.auth.sendVerificationEmail);

  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const clearError = (field: SignUpFields) => {
    setVisibleErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  function onInvalid(fieldErrors: typeof form.formState.errors) {
    const messages: Partial<Record<SignUpFields, string>> = {};
    for (const key in fieldErrors) {
      if (key === "root") continue;
      const field = key as SignUpFields;
      const error = fieldErrors[field];
      if (error && "message" in error && typeof error.message === "string") {
        messages[field] = error.message;
      }
    }
    setVisibleErrors(messages);
  }

  async function onSubmit(data: z.infer<typeof signUpSchema>) {
    const pendingName = createPendingName();

    startTransition(async () => {
      try {
        // Check if email is banned
        const banCheck = await assertEmailNotBanned({ email: data.email });
        if (!banCheck.allowed) {
          setBlockedMessage(
            banCheck.message || "This email is permanently banned and cannot create new accounts."
          );
          setVisibleErrors({});
          return;
        }

        // Check IP-based rate limit
        const ipAddress = await getClientIpAddress();
        const rateLimitCheck = await fetch("/api/auth/check-rate-limit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ipAddress, email: data.email }),
        });

        if (!rateLimitCheck.ok) {
          const errorData = await rateLimitCheck.json();
          setBlockedMessage(
            errorData.message || "Too many accounts created from this IP. Please try again later."
          );
          setVisibleErrors({});
          return;
        }
      } catch (error) {
        setBlockedMessage(
          error instanceof Error ? error.message : "Unable to validate account status"
        );
        setVisibleErrors({});
        return;
      }

      await authClient.signUp.email({
        email: data.email,
        name: pendingName,
        password: data.password,
        fetchOptions: {
          onSuccess: async () => {
            showSuccessToast("Account created! Check your email to verify.");

            // Token is generated and stored server-side — just pass the email
            try {
              await sendVerificationEmail({ email: data.email });
            } catch (err) {
              console.error("[SignUp][SendVerificationEmail]", err);
              // Don't block navigation — user can resend from the waiting room
            }

            // Pass email as URL param so the waiting room can display it
            // without requiring an active session (requireEmailVerification: true
            // means no session exists until the email is verified)
            router.push(
              `/auth/verify-email?email=${encodeURIComponent(data.email)}`
            );
          },
          onError: (error) => {
            setBlockedMessage(error.error.message);
            setVisibleErrors({});
          },
        },
      });
    });
  }

  function handleSocialSignIn(provider: "github") {
    if (
      authProviderStatus?.siteUrl?.includes("localhost") &&
      typeof window !== "undefined" &&
      !window.location.host.includes("localhost")
    ) {
      showErrorToast("SITE_URL in Convex is using localhost. Set SITE_URL to your real app URL.");
      return;
    }

    const isProviderConfigured = provider === "github" && authProviderStatus?.githubConfigured;

    if (!isProviderConfigured) {
      showErrorToast(
        `${provider} OAuth is not configured for this deployment. Set provider env vars in Convex dashboard and redeploy.`
      );
      return;
    }

    startTransition(async () => {
      await authClient.signIn.social({
        provider,
        callbackURL: "/onboarding/post-auth",
        newUserCallbackURL: "/onboarding/complete-profile?force=1",
        requestSignUp: true,
        fetchOptions: {
          onError: (error) => {
            showErrorToast(error.error.message || `Failed to sign up with ${provider}`);
          },
        },
      });
    });
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

      <form
        className="flex flex-col w-full max-w-md gap-6"
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
      >
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="text-paragraph text-sm">
              Create account first, then choose your profile name.
            </p>
            {(searchParams.get("banned") === "1" || blockedMessage) && (
              <p className="text-sm text-destructive">
                {blockedMessage ||
                  searchParams.get("reason") ||
                  "This email has been permanently banned. You cannot create an account."}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Controller
              name="email"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    aria-invalid={!!visibleErrors.email}
                    placeholder="Email address"
                    type="email"
                    autoComplete="email"
                    id="email"
                    required
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      clearError("email");
                    }}
                  />
                  {visibleErrors.email && (
                    <FieldError errors={[{ message: visibleErrors.email }]} />
                  )}
                </Field>
              )}
            />
            <FieldDescription>This will be your primary login.</FieldDescription>
          </div>

          <div className="flex flex-col gap-2">
            <Controller
              name="password"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    aria-invalid={!!visibleErrors.password}
                    placeholder="********"
                    type="password"
                    id="password"
                    required
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      clearError("password");
                      clearError("confirmPassword");
                    }}
                  />
                  {visibleErrors.password && (
                    <FieldError errors={[{ message: visibleErrors.password }]} />
                  )}
                </Field>
              )}
            />
            <FieldDescription>
              Must be at least 8 characters long and include a number, an uppercase letter and a
              special character.
            </FieldDescription>
          </div>

          <div className="flex flex-col gap-2">
            <Controller
              name="confirmPassword"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="********"
                    required
                    {...field}
                    aria-invalid={!!visibleErrors.confirmPassword}
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
            <FieldDescription>Please confirm your password.</FieldDescription>
          </div>

          <Field>
            <Button disabled={isPending} className="cursor-pointer">
              {isPending && <Loader2 className="size-4 animate-spin" />}
              <span>Create Account</span>
            </Button>
          </Field>

          <FieldSeparator>Or continue with</FieldSeparator>
          <Field>
            <Button
              variant="outline"
              type="button"
              className="cursor-pointer"
              disabled={isPending}
              onClick={() => handleSocialSignIn("github")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path
                  d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                  fill="currentColor"
                />
              </svg>
              Sign up with GitHub
            </Button>
            <FieldDescription className="px-6 text-center">
              Already have an account? <Link href="/auth/login">Log in</Link>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}