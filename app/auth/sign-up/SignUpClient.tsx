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
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";
import { safeNextPath, withNext } from "@/lib/next-path";
import { PasswordInput } from "@/components/ui/password-input";
import Github from "@thesvg/react/github";

type SignUpFields = keyof z.infer<typeof signUpSchema>;

export default function SignUpClient() {
  const [isPending, startTransition] = useTransition();
  const [visibleErrors, setVisibleErrors] = useState<Partial<Record<SignUpFields, string>>>({});
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [existingAccount, setExistingAccount] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const authProviderStatus = useQuery(api.auth.getAuthProviderStatus);

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
      // Bans, the per-IP account limit and existing accounts are checked by the server
      // (convex/auth.ts); a refusal comes back through onError below. better-auth sends the
      // verification e-mail; its link signs the member in and returns to `callbackURL`.
      const emailParam = encodeURIComponent(data.email);
      await authClient.signUp.email({
        email: data.email,
        name: pendingName,
        password: data.password,
        callbackURL: withNext(`/auth/verify-email?verified=1&email=${emailParam}`, next),
        fetchOptions: {
          onSuccess: () => {
            showSuccessToast("Account created! Check your email to verify.");
            // No session exists until the address is verified, so the waiting room gets
            // the address from the URL.
            router.push(withNext(`/auth/verify-email?email=${emailParam}`, next));
          },
          onError: (error) => {
            const isExisting = error.error.code === "USER_ALREADY_EXISTS";
            setExistingAccount(isExisting);
            setBlockedMessage(isExisting ? null : error.error.message);
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
        callbackURL: withNext("/onboarding/post-auth", next),
        newUserCallbackURL: withNext("/onboarding/complete-profile?force=1", next),
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
            <h1 className="type-title">Sign up</h1>
            {existingAccount && (
              <p role="alert" className="text-sm text-destructive">
                An account with this e-mail already exists.{" "}
                <Link href={withNext("/auth/login", next)} className="underline">
                  Sign in
                </Link>{" "}
                or{" "}
                <Link href="/auth/forgot-password" className="underline">
                  reset your password
                </Link>
                .
              </p>
            )}
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
                    placeholder="you@example.com"
                    type="email"
                    autoComplete="email"
                    id="email"
                    required
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      clearError("email");
                      setExistingAccount(false);
                    }}
                  />
                  {visibleErrors.email && (
                    <FieldError errors={[{ message: visibleErrors.email }]} />
                  )}
                </Field>
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Controller
              name="password"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <PasswordInput
                    aria-invalid={!!visibleErrors.password}
                    placeholder="********"
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
            <FieldDescription>8+ characters, a number, an uppercase letter and a symbol.</FieldDescription>
          </div>

          <div className="flex flex-col gap-2">
            <Controller
              name="confirmPassword"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="confirm-password">Confirm</FieldLabel>
                  <PasswordInput
                    id="confirm-password"
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
          </div>

          <Field>
            <Button disabled={isPending} className="cursor-pointer">
              {isPending && <Loader2 className="size-4 animate-spin" />}
              <span>Sign up</span>
            </Button>
          </Field>

          <FieldSeparator>or</FieldSeparator>
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
            <FieldDescription className="px-6 text-center">
              <Link href={withNext("/auth/login", next)}>Log in</Link>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}