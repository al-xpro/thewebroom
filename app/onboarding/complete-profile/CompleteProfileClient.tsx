"use client";

import { useEffect, useState, useTransition } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { isNameComplete } from "@/lib/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import z from "zod";

const completeProfileSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(20, "Name must be at most 20 characters")
    .regex(/^[a-zA-Z0-9\s-]+$/, "Name cannot contain special characters"),
});

type CompleteProfileFields = keyof z.infer<typeof completeProfileSchema>;

export default function CompleteProfileClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const force = searchParams.get("force") === "1";

  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.auth.getCurrentUser, isAuthenticated ? undefined : "skip");

  const [isPending, startTransition] = useTransition();
  const [visibleErrors, setVisibleErrors] = useState<Partial<Record<CompleteProfileFields, string>>>({});

  const form = useForm<z.infer<typeof completeProfileSchema>>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    if (user === undefined) return;

    if (isNameComplete(user?.name) && !force) {
      router.replace("/");
      return;
    }

    if (!force && user?.name) {
      form.setValue("name", user.name, { shouldValidate: true });
    }
  }, [form, force, isAuthenticated, isLoading, router, user]);

  function onInvalid(fieldErrors: typeof form.formState.errors) {
    const messages: Partial<Record<CompleteProfileFields, string>> = {};
    for (const key in fieldErrors) {
      if (key === "root") continue;
      const field = key as CompleteProfileFields;
      const error = fieldErrors[field];
      if (error && "message" in error && typeof error.message === "string") {
        messages[field] = error.message;
      }
    }
    setVisibleErrors(messages);
  }

  function clearError(field: CompleteProfileFields) {
    setVisibleErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function onSubmit(values: z.infer<typeof completeProfileSchema>) {
    startTransition(async () => {
      await authClient.updateUser({
        name: values.name,
        fetchOptions: {
          onSuccess: () => {
            showSuccessToast("Profile completed successfully");
            router.replace("/");
          },
          onError: (error) => {
            showErrorToast(error.error.message || "Failed to update profile");
          },
        },
      });
    });
  }

  if (isLoading || !isAuthenticated || user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-paragraph" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form className="w-full max-w-md" onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
        <FieldGroup>
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold">Complete Your Profile</h1>
            <p className="text-sm text-paragraph">
              Choose your display name to finish account setup.
            </p>
          </div>

          <Controller
            name="name"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="name">Display Name</FieldLabel>
                <Input
                  id="name"
                  required
                  autoComplete="nickname"
                  placeholder="Your display name"
                  aria-invalid={!!visibleErrors.name}
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    clearError("name");
                  }}
                />
                {visibleErrors.name && <FieldError errors={[{ message: visibleErrors.name }]} />}
              </Field>
            )}
          />

          <Button disabled={isPending} className="w-full">
            {isPending && <Loader2 className="size-4 animate-spin" />}
            <span>Save Name</span>
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
