"use client";

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
import { MemberAvatar } from "@/components/web/MemberAvatar";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const completeProfileSchema = z.object({
  topics: z.array(z.enum(TOPICS)).min(2, "Pick at least two topics to follow"),
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
  const followUser = useMutation(api.follows.followUser);

  // Two steps: name and topics, then three writers to follow, so the Following page isn't
  // empty on the first visit.
  const [step, setStep] = useState<"profile" | "people">("profile");
  const [chosenTopics, setChosenTopics] = useState<Topic[]>([]);
  const [toFollow, setToFollow] = useState<Set<string>>(new Set());
  const suggestions = useQuery(
    api.follows.suggestedAuthors,
    isAuthenticated && step === "people" ? { topics: chosenTopics } : "skip"
  );

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

    // Step 1 completes the profile; step 2 still has writers to show.
    if (user && isOnboardingComplete(user) && !force && step === "profile") {
      router.replace(next ?? "/");
      return;
    }

    if (followedTopics?.length && form.getValues("topics").length === 0) {
      form.setValue("topics", followedTopics);
    }

    if (!force && user && isOnboardingComplete(user) && user?.displayUsername) {
      form.setValue("name", user.displayUsername, { shouldValidate: true });
    }
  }, [followedTopics, form, force, isAuthenticated, isLoading, next, router, step, user]);

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

  // Step 1 saves the name and topics; step 2 follows the writers picked, then leaves.
  function onSubmit(values: z.infer<typeof completeProfileSchema>) {
    startTransition(async () => {
      try {
        await completeProfileOnboarding({ name: values.name });
        await setFollowedTopics({ topics: values.topics });
        setChosenTopics(values.topics);
        setStep("people");
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : "Failed to update profile");
      }
    });
  }

  function finish() {
    startTransition(async () => {
      try {
        for (const userId of toFollow) await followUser({ userId });
        showSuccessToast(toFollow.size ? `Following ${toFollow.size} ${toFollow.size === 1 ? "writer" : "writers"}` : "You're all set");
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : "Couldn't follow everyone");
      }
      router.replace(next ?? "/following");
    });
  }

  // No one to suggest yet (a new site, or topics nobody writes about): skip the step.
  useEffect(() => {
    if (step === "people" && suggestions && suggestions.length === 0) router.replace(next ?? "/");
  }, [next, router, step, suggestions]);

  if (isLoading || !isAuthenticated || user === undefined) {
    return (
      <div className="flex w-full h-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-paragraph" />
      </div>
    );
  }

  if (step === "people") {
    return (
      <div className="relative w-full h-full flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-full max-w-md space-y-6"
        >
          <div className="text-center space-y-1">
            <p className="type-label">Step 2 of 2</p>
            <h1 className="text-2xl font-bold">Writers to follow</h1>
            <p className="text-sm text-paragraph">
              They write the most about {chosenTopics.slice(0, 2).join(" and ")}
              {chosenTopics.length > 2 ? " and more" : ""}. Their new posts appear in Following.
            </p>
          </div>

          {!suggestions ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-5 animate-spin text-paragraph" />
            </div>
          ) : (
            <ul className="space-y-2">
              <AnimatePresence initial>
                {suggestions.map((author, index) => {
                  const on = toFollow.has(author.id);
                  return (
                    <motion.li
                      key={author.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.06 }}
                    >
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          setToFollow((current) => {
                            const nextSet = new Set(current);
                            if (on) nextSet.delete(author.id);
                            else nextSet.add(author.id);
                            return nextSet;
                          })
                        }
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors",
                          on ? "bg-black/5 dark:bg-white/10" : "hover:bg-black/[0.03] dark:hover:bg-white/5"
                        )}
                      >
                        <MemberAvatar name={author.name} url={author.avatarUrl} className="size-10" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{author.name}</span>
                          <span className="block truncate text-xs text-paragraph">
                            {author.posts} {author.posts === 1 ? "post" : "posts"} · latest: {author.latest.title}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs",
                            on ? "bg-black text-white dark:bg-white dark:text-black" : "border border-black/10 dark:border-white/15"
                          )}
                        >
                          {on ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                          {on ? "Following" : "Follow"}
                        </span>
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}

          <div className="space-y-2">
            {suggestions && suggestions.length > 1 && toFollow.size < suggestions.length && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isPending}
                onClick={() => setToFollow(new Set(suggestions.map((author) => author.id)))}
              >
                Follow all {suggestions.length === 3 ? "three" : suggestions.length}
              </Button>
            )}
            <Button type="button" className="w-full" disabled={isPending} onClick={finish}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {toFollow.size ? "Finish" : "Skip for now"}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center px-4">
      <form className="w-full max-w-md" onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
        <FieldGroup>
          <div className="text-center space-y-1">
            <p className="type-label">Step 1 of 2</p>
            <h1 className="text-2xl font-bold">Complete Your Profile</h1>
            <p className="text-sm text-paragraph">
              Choose your display name and at least two topics to follow.
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
            <span>Next</span>
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
