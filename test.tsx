"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { postSchema } from "@/app/schemas/blog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload, PenLine } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import dynamic from "next/dynamic";
import { createBlogAction } from "@/app/actions";
import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/web/Footer";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";
import { useConvexAuth } from "convex/react";

// Dynamic import prevents the editor from flashing on page refresh.
// TipTap initialises only in the browser — a static import causes it to
// briefly unmount/remount during React hydration, making the editor
// disappear for a frame. The fixed-height placeholder prevents layout shift.
const RichTextEditor = dynamic(
  () => import("@/components/ui/rich-text-editor").then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[548px] bg-white dark:bg-black rounded-md border border-input" />
    ),
  }
);

export function CreatePostClient() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [isPending, setIsPending] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Login nudge modal — shown after 3 seconds for unauthenticated visitors
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [visibleErrors, setVisibleErrors] = useState<
    Partial<Record<keyof z.infer<typeof postSchema>, string>>
  >({});

  const clearError = (field: keyof z.infer<typeof postSchema>) => {
    setVisibleErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const form = useForm<z.infer<typeof postSchema>>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      content:     "",
      contentHtml: "",
      title:       "",
      subtitle:    "",
      minRead:     5,
      topic:       "Web Development",
      image:       undefined,
    },
  });

  // Show modal after 3 s only for unauthenticated users.
  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) return;
    const timer = setTimeout(() => setShowAuthModal(true), 3000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading]);

  // Lock body scroll while the auth modal is open so the user
  // can't scroll past it. Cleaned up on unmount.
  useEffect(() => {
    if (showAuthModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showAuthModal]);

  async function onSubmit(values: z.infer<typeof postSchema>) {
    setIsPending(true);
    try {
      await createBlogAction(values);
      showSuccessToast("Post published successfully!");
      router.push("/my-posts");
    } catch (error) {
      // redirect() in server actions works by throwing a special internal
      // error. Re-throw it so Next.js can follow the redirect instead of
      // treating it as a failure and showing a "NEXT_REDIRECT" toast.
      if (isRedirectError(error)) throw error;
      showErrorToast(error instanceof Error ? error.message : "Failed to publish post");
    } finally {
      setIsPending(false);
    }
  }

  type PostFields = keyof z.infer<typeof postSchema>;

  function onInvalid(fieldErrors: typeof form.formState.errors) {
    const messages: Partial<Record<PostFields, string>> = {};
    for (const key in fieldErrors) {
      if (key === "root") continue;
      const k = key as PostFields;
      const error = fieldErrors[k];
      if (error && "message" in error && typeof error.message === "string") {
        messages[k] = error.message;
      }
    }
    setVisibleErrors(messages);
  }

  const imageFile  = form.watch("image");
  const previewUrl = imageFile ? URL.createObjectURL(imageFile) : null;

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragOver  = (e: DragEvent) => e.preventDefault();
    const handleDragLeave = (e: DragEvent) => {
      if (e.clientX === 0 && e.clientY === 0) setIsDragging(false);
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) form.setValue("image", file);
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover",  handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop",      handleDrop);
    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover",  handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop",      handleDrop);
    };
  }, [form]);

  return (
    <>
      {/* ── Auth nudge modal — permanent, no dismiss ── */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative bg-white dark:bg-[#111] rounded-2xl shadow-2xl max-w-sm w-full p-8 flex flex-col items-center gap-6 text-center">
            <div className="flex items-center justify-center size-14 rounded-full bg-primary/10">
              <PenLine className="size-7 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-black dark:text-white">
                Ready to write?
              </h2>
              <p className="text-sm text-paragraph leading-relaxed">
                Creating posts is reserved for signed-in members. Join the community or log in to start sharing your ideas.
              </p>
            </div>
            <div className="flex flex-col w-full gap-3">
              <Link href="/auth/sign-up" className={buttonVariants({ size: "lg", className: "w-full" })}>
                Create account
              </Link>
              <Link
                href="/auth/login"
                className={buttonVariants({ variant: "outline", size: "lg", className: "w-full" })}
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Drag overlay ── */}
      {isDragging && (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-white">
            <div className="text-7xl">+</div>
            <p className="text-xl font-semibold">Drop image to upload</p>
          </div>
        </div>
      )}

      <Card className="w-full max-w-4xl mx-auto">
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
            <FieldGroup className="gap-y-6">

              {/* Title */}
              <Controller
                name="title"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Title</FieldLabel>
                    <Input
                      {...field}
                      aria-invalid={!!visibleErrors.title}
                      placeholder="What's the subject?"
                      className="bg-white dark:bg-black"
                      onChange={(e) => { field.onChange(e); clearError("title"); }}
                    />
                    {visibleErrors.title && (
                      <FieldError errors={[{ message: visibleErrors.title }]} />
                    )}
                  </Field>
                )}
              />

              {/* Subtitle */}
              <Controller
                name="subtitle"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Subtitle</FieldLabel>
                    <Input
                      {...field}
                      aria-invalid={!!visibleErrors.subtitle}
                      placeholder="What's your main idea?"
                      className="bg-white dark:bg-black"
                      onChange={(e) => { field.onChange(e); clearError("subtitle"); }}
                    />
                    {visibleErrors.subtitle && (
                      <FieldError errors={[{ message: visibleErrors.subtitle }]} />
                    )}
                  </Field>
                )}
              />

              {/* Min read + Topic */}
              <div className="flex w-full gap-2 sm:gap-5">
                <div className="flex w-1/2">
                  <Controller
                    name="minRead"
                    control={form.control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel>Minutes Read</FieldLabel>
                        <Input
                          aria-invalid={!!visibleErrors.minRead}
                          type="number"
                          min="1"
                          max="30"
                          placeholder="Estimated reading time"
                          className="bg-white dark:bg-black"
                          {...field}
                          onChange={(e) => { field.onChange(Number(e.target.value)); clearError("minRead"); }}
                        />
                        {visibleErrors.minRead && (
                          <FieldError errors={[{ message: visibleErrors.minRead }]} />
                        )}
                      </Field>
                    )}
                  />
                </div>
                <div className="flex w-1/2">
                  <Controller
                    name="topic"
                    control={form.control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel className="text-black dark:text-white">Topic</FieldLabel>
                        <Select
                          value={field.value}
                          onValueChange={(v) => { field.onChange(v); clearError("topic"); }}
                        >
                          <SelectTrigger aria-invalid={!!visibleErrors.topic}>
                            <SelectValue placeholder="Select a topic" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Web Development">Web Development</SelectItem>
                            <SelectItem value="Design & UI">Design & UI</SelectItem>
                            <SelectItem value="AI">AI</SelectItem>
                            <SelectItem value="Engineering">Engineering</SelectItem>
                          </SelectContent>
                        </Select>
                        {visibleErrors.topic && (
                          <FieldError errors={[{ message: visibleErrors.topic }]} />
                        )}
                      </Field>
                    )}
                  />
                </div>
              </div>

              {/* Featured image */}
              <Controller
                name="image"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel className="text-black dark:text-white">Featured Image</FieldLabel>
                    <div className="relative flex flex-col-reverse sm:flex-row w-full h-full items-center justify-center gap-2 sm:gap-5">
                      {previewUrl ? (
                        <div className="relative flex w-full sm:w-1/2 h-[220px] p-3 border border-input bg-white dark:bg-black rounded-md">
                          <Image
                            src={previewUrl}
                            alt="Preview"
                            fill
                            sizes="100%"
                            loading="eager"
                            className="object-cover rounded p-3"
                          />
                        </div>
                      ) : (
                        <div className="hidden sm:flex w-full sm:w-1/2 h-[220px] rounded-md border border-dashed border-input items-center justify-center">
                          <p className="text-xs text-paragraph">Preview will appear here</p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        id="image-upload"
                        className="hidden"
                        onChange={(e) => { field.onChange(e.target.files?.[0]); clearError("image"); }}
                      />
                      <label
                        htmlFor="image-upload"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file) { field.onChange(file); clearError("image"); }
                        }}
                        className="flex items-center justify-between w-full sm:w-1/2 h-9 sm:h-[220px] px-4 rounded-md border border-input bg-white dark:bg-black hover:bg-[#FAFAFA] dark:hover:bg-[#1E1E1E] text-sm cursor-pointer transition"
                      >
                        <div className="relative flex sm:flex-col-reverse w-full h-full items-center justify-center gap-2">
                          <div className="flex sm:flex-col min-w-0 items-center justify-center gap-4 w-full">
                            <Upload className="size-4 shrink-0 text-black dark:text-white" />
                            <div className="flex flex-row-reverse sm:flex-col items-center min-w-0 truncate gap-1">
                              <p className="text-black dark:text-white truncate">
                                {field.value ? field.value.name : "Upload image"}
                              </p>
                              {field.value && (
                                <p className="text-black dark:text-white flex min-w-10 truncate">
                                  {`${(field.value.size / 1024 / 1024).toFixed(1)}MB`}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </label>
                    </div>
                    {visibleErrors.image && (
                      <FieldError errors={[{ message: visibleErrors.image }]} />
                    )}
                  </Field>
                )}
              />

              {/* Content */}
              <Controller
                name="contentHtml"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel className="text-black dark:text-white">Content</FieldLabel>
                    <RichTextEditor
                      value={field.value}
                      hasError={!!visibleErrors.contentHtml}
                      onChange={(text, html) => {
                        form.setValue("content",     text);
                        form.setValue("contentHtml", html);
                        clearError("contentHtml");
                        clearError("content");
                      }}
                      placeholder="Write your content here... Use the toolbar for formatting"
                    />
                    {visibleErrors.contentHtml && (
                      <FieldError errors={[{ message: visibleErrors.contentHtml }]} />
                    )}
                  </Field>
                )}
              />

              <Button disabled={isPending} size="lg" className="w-full">
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <span>Publish Article</span>
                )}
              </Button>

            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </>
  );
}