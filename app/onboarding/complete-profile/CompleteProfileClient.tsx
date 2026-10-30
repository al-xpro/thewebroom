"use client";

import { trackEvent } from "@/lib/analytics";
import { useEffect, useState, useTransition } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { isOnboardingComplete } from "@/lib/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import z from "zod";
import { safeNextPath } from "@/lib/next-path";
import { TOPICS, type Topic } from "@/convex/topics";
import { TopicFollowPicker } from "@/components/web/TopicFollowPicker";

const completeProfileSchema = z.object({
  topics: z.array(z.enum(TOPICS)).min(1, "Pick at least one topic to follow"),
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(10, "Name must be at most 10 characters")
    .regex(/^[a-zA-Z0-9\s-]+$/, "Name cannot contain special characters"),
});

type CompleteProfileFields = keyof z.infer<typeof completeProfileSchema>;

export default function CompleteProfileClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const force = searchParams.get("force") === "1";
  const next = safeNextPath(searchParams.get("next"));

  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.auth.getCurrentUser, isAuthenticated ? undefined : "skip");
  const completeProfileOnboarding = useMutation(api.auth.completeProfileOnboarding);
  const setFollowedTopics = useMutation(api.follows.setFollowedTopics);
  const followedTopics = useQuery(api.follows.myFollowedTopics, isAuthenticated ? {} : "skip");

  const [isPending, startTransition] = useTransition();
  const [visibleErrors, setVisibleErrors] = useState<
    Partial<Record<CompleteProfileFields, string>>
  >({});

  const form = useForm<z.infer<typeof completeProfileSchema>>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      name: "",
      topics: [],
    },
  });

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }

    if (user === undefined) return;

    // Check if email is verified
    if (user && !user.emailVerified) {
      showErrorToast("Please verify your email to continue");
      router.replace("/auth/login");
      return;
    }

    if (user && isOnboardingComplete(user) && !force) {
      router.replace(next ?? "/");
      return;
    }

    if (followedTopics?.length && form.getValues("topics").length === 0) {
      form.setValue("topics", followedTopics);
    }

    if (!force && user && isOnboardingComplete(user) && user?.displayUsername) {
      form.setValue("name", user.displayUsername, { shouldValidate: true });
    }
  }, [followedTopics, form, force, isAuthenticated, isLoading, next, router, user]);

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
      try {
        await completeProfileOnboarding({ name: values.name });
        await setFollowedTopics({ topics: values.topics });
        showSuccessToast("Profile completed successfully");
        trackEvent("onboarding_completed", { topics: values.topics.length });
        router.replace(next ?? "/");
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : "Failed to update profile");
      }
    });
  }

  if (isLoading || !isAuthenticated || user === undefined) {
    return (
      <div className="flex w-full h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-paragraph" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center px-4">
      <form className="w-full max-w-md" onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
        <FieldGroup>
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold">Complete Your Profile</h1>
            <p className="text-sm text-paragraph">
              Choose your display name and the topics you want to follow.
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
                  autoComplete="name"
                  minLength={3}
                  maxLength={10}
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

          <Controller
            name="topics"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel>Topics to follow</FieldLabel>
                <p className="text-xs text-paragraph">
                  Posts on these topics show up first for you. Change them any time on your profile.
                </p>
                <TopicFollowPicker
                  selected={field.value}
                  disabled={isPending}
                  onToggle={(topic: Topic) => {
                    field.onChange(
                      field.value.includes(topic)
                        ? field.value.filter((t) => t !== topic)
                        : [...field.value, topic]
                    );
                    clearError("topics");
                  }}
                />
                {visibleErrors.topics && <FieldError errors={[{ message: visibleErrors.topics }]} />}
              </Field>
            )}
          />

          <Button disabled={isPending} className="w-full">
            {isPending && <Loader2 className="size-4 animate-spin" />}
            <span>Finish</span>
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
