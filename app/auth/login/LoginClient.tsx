"use client";

import { loginSchema } from "@/app/schemas/auth";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useTransition, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import Link from "next/link";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams } from "next/navigation";
import { safeNextPath, withNext } from "@/lib/next-path";
import { PasswordInput } from "@/components/ui/password-input";

type LoginFields = keyof z.infer<typeof loginSchema>;

export default function LoginClient() {
  const [isPending, startTransition] = useTransition();
  const [visibleErrors, setVisibleErrors] = useState<Partial<Record<LoginFields, string>>>({});
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const justVerified = searchParams.get("verified") === "1";
  const authProviderStatus = useQuery(api.auth.getAuthProviderStatus);
  const assertEmailNotBanned = useMutation(api.auth.assertEmailNotBanned);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const clearError = (field: LoginFields) => {
    setVisibleErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  function onInvalid(fieldErrors: typeof form.formState.errors) {
    const messages: Partial<Record<LoginFields, string>> = {};
    for (const key in fieldErrors) {
      if (key === "root") continue;
      const field = key as LoginFields;
      const error = fieldErrors[field];
      if (error && "message" in error && typeof error.message === "string") {
        messages[field] = error.message;
      }
    }
    setVisibleErrors(messages);
  }

  function onSubmit(data: z.infer<typeof loginSchema>) {
    startTransition(async () => {
      try {
        const banCheck = await assertEmailNotBanned({ email: data.email });
        if (!banCheck.allowed) {
          const message =
            banCheck.message || "This account is permanently banned and cannot access the app.";
          setBlockedMessage(message);
          showErrorToast(message);
          return;
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to validate account status";
        setBlockedMessage(message);
        showErrorToast(message);
        return;
      }

      await authClient.signIn.email({
        email: data.email,
        password: data.password,
        callbackURL: withNext("/onboarding/post-auth", next),
        fetchOptions: {
          onSuccess: async () => {
            showSuccessToast("Logged in successfully");
            await new Promise((resolve) => setTimeout(resolve, 300));
            window.location.href = withNext("/onboarding/post-auth", next);
          },
          onError: (error) => {
            // better-auth sends a new verification link on this error (sendOnSignIn).
            showErrorToast(
              error.error.code === "EMAIL_NOT_VERIFIED"
                ? "Verify your e-mail first: we've sent you a new link."
                : error.error.message
            );
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
        requestSignUp: false,
        callbackURL: withNext("/onboarding/post-auth", next),
        newUserCallbackURL: withNext("/onboarding/complete-profile?force=1", next),
        fetchOptions: {
          onError: (error) => {
            const message = error.error.message || `Failed to login with ${provider}`;
            showErrorToast(message);
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
            <h1 className="text-2xl font-bold">Login to your account</h1>
            <p className="text-paragraph text-sm text-paragraph">
              Enter your email below to login&nbsp;
              <span className="whitespace-nowrap">to your account.</span>
            </p>
            {(searchParams.get("banned") === "1" || blockedMessage) && (
              <p className="text-sm text-destructive">
                {blockedMessage ||
                  searchParams.get("reason") ||
                  "Your account has been permanently banned. Access is revoked."}
              </p>
            )}
          </div>
          {justVerified && (
            <p className="text-center text-sm text-primary">
              Email verified! Please log in to continue.
            </p>
          )}
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
                  id="email"
                  required
                  autoComplete="email"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    clearError("email");
                  }}
                />
                {visibleErrors.email && <FieldError errors={[{ message: visibleErrors.email }]} />}
              </Field>
            )}
          />
          <Controller
            name="password"
            control={form.control}
            render={({ field }) => (
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto text-sm underline underline-offset-4 text-paragraph hover:text-primary!"
                  >
                    Forgot password?
                  </Link>
                </div>
                <PasswordInput
                  aria-invalid={!!visibleErrors.password}
                  placeholder="********"
                  id="password"
                  required
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    clearError("password");
                  }}
                />
                {visibleErrors.password && (
                  <FieldError errors={[{ message: visibleErrors.password }]} />
                )}
              </Field>
            )}
          />
          <Field>
            <Button disabled={isPending} className="cursor-pointer">
              {isPending && <Loader2 className="size-4 animate-spin" />}
              <span>Login</span>
            </Button>
          </Field>
          <FieldSeparator className="text-paragraph">Or continue with</FieldSeparator>
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
              Login with GitHub
            </Button>
            <FieldDescription className="text-center">
              Don&apos;t have an account?&nbsp;
              <Link href={withNext("/auth/sign-up", next)} className="underline underline-offset-4 text-paragraph">
                Sign up
              </Link>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
