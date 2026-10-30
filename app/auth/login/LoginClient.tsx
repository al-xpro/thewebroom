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
import Github from "@thesvg/react/github";

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
            <h1 className="type-title">Log in</h1>
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
                  placeholder="you@example.com"
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
              <span>Log in</span>
            </Button>
          </Field>
          <FieldSeparator className="text-paragraph">or</FieldSeparator>
          <Field>
            <Button
              variant="outline"
              type="button"
              className="cursor-pointer"
              disabled={isPending}
              onClick={() => handleSocialSignIn("github")}
            >
              <Github variant="mono" className="size-4" aria-hidden />
              GitHub
            </Button>
            <FieldDescription className="text-center">
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
