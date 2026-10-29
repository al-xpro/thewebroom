"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { postSchema } from "@/app/schemas/blog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  Book,
  BookDashed,
  BookType,
  Calendar,
  Check,
  ClockFading,
  Copy,
  Loader2,
  Pen,
  Upload,
  User,
} from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { createBlogAction } from "@/app/actions";
import Image from "next/image";
import Link from "next/link";
import Footer from "@/components/web/Footer";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";
import { useConvexAuth, useQuery } from "convex/react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { generateSlug } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/convex/_generated/api";
import { FunctionReturnType } from "convex/server";
import { TOPICS } from "@/convex/topics";

const TOPIC_OPTIONS = TOPICS;

type PostValues = z.infer<typeof postSchema>;
type PostFields = keyof PostValues;

type UserType = FunctionReturnType<typeof api.auth.getCurrentUser>;

interface CreatePostClientProps {
  initialUser: UserType;
}

function EditorialError({ message, className }: { message?: string; className?: string }) {
  if (!message) return null;

  return <p className={cn("text-sm text-[#CB2A2E] dark:text-[#FF6166]", className)}>{message}</p>;
}

function CopySlugButton({ slug }: { slug: string }) {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) return;

    const timeout = setTimeout(() => setIsCopied(false), 1000);
    return () => clearTimeout(timeout);
  }, [isCopied]);

  const handleCopy = async () => {
    if (!slug) return;

    try {
      await navigator.clipboard.writeText(slug);
      setIsCopied(true);
    } catch (error) {
      console.error("Clipboard error:", error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!slug}
      className="hidden sm:flex w-8 flex-col items-center gap-2 text-primary transition-opacity disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
    >
      {isCopied ? <Check className="size-4 sm:size-5" /> : <Copy className="size-4 sm:size-5" />}
      <span className="flex items-center gap-2">{isCopied ? "Copied!" : "Copy"}</span>
    </button>
  );
}

export function CreatePostClient({ initialUser }: CreatePostClientProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [isPending, setIsPending] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isMetaEditing, setIsMetaEditing] = useState(false);
  const [draftPending, setDraftPending] = useState(false);
  const [isTopicOpen, setIsTopicOpen] = useState(false);
  const [isMinReadEditing, setIsMinReadEditing] = useState(false);

  const userQuery = useQuery(api.auth.getCurrentUser, isAuthenticated ? undefined : "skip");
  const user = userQuery ?? initialUser;

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Login nudge modal — shown after 3 seconds for unauthenticated visitors
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [visibleErrors, setVisibleErrors] = useState<Partial<Record<PostFields, string>>>({});

  const clearError = (field: PostFields) => {
    setVisibleErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const form = useForm<PostValues>({
    resolver: zodResolver(postSchema),
    mode: "onChange",
    defaultValues: {
      content: "",
      contentHtml: "",
      title: "",
      subtitle: "",
      minRead: 5,
      topic: "Web Architecture",
      image: undefined,
    },
  });

  const clamp = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
  };

  // Show modal after 3 s only for unauthenticated users.
  // The server component already redirects logged-out users on hard nav,
  // but client-side transitions or slow auth restores may land here briefly.
  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) return;

    const timer = setTimeout(() => setShowAuthModal(true), 3000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading]);

  async function onSubmit(values: PostValues, status: "published" | "draft" = "published") {
    if (status === "draft") {
      setDraftPending(true);
    } else {
      setIsPending(true);
    }

    try {
      const { slug } = await createBlogAction(values, status);

      if (status === "draft") {
        showSuccessToast("Draft saved successfully!");
        router.push("/my-posts");
      } else {
        showSuccessToast("Post published successfully!");
        router.push(`/posts/${slug}`);
      }
    } catch (error) {
      if (isRedirectError(error)) throw error;
      showErrorToast(
        error instanceof Error
          ? error.message
          : status === "draft"
            ? "Failed to save draft"
            : "Failed to publish post"
      );
    } finally {
      setIsPending(false);
      setDraftPending(false);
    }
  }

  useEffect(() => {
    if (showAuthModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showAuthModal]);

  function onInvalid(fieldErrors: typeof form.formState.errors) {
    const messages: Partial<Record<PostFields, string>> = {};
    for (const key in fieldErrors) {
      if (key === "root") continue;
      const fieldName = key as PostFields;
      const error = fieldErrors[fieldName];
      if (error && "message" in error && typeof error.message === "string") {
        messages[fieldName] = error.message;
      }
    }
    setVisibleErrors(messages);
  }

  const imageFile = form.watch("image");
  const titleValue = form.watch("title");
  const slugPreview = generateSlug(titleValue);

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };
    const handleDragOver = (e: DragEvent) => e.preventDefault();
    const handleDragLeave = (e: DragEvent) => {
      if (e.clientX === 0 && e.clientY === 0) setIsDragging(false);
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) {
        form.setValue("image", file, { shouldDirty: true });
        clearError("image");
      }
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [form]);

  return (
    <>
      {showAuthModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative flex w-full max-w-md flex-col items-center gap-6 rounded-2xl bg-[#EDEDED] p-8 text-center dark:bg-[#0A0A0A]">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
              <Pen className="size-7 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-black dark:text-white">
                Ready to write?
              </h2>
              <p className="text-sm leading-relaxed text-paragraph">
                Creating posts is reserved for signed-in members. <br className="hidden sm:block" />
                &nbsp; Join the community or log in to start sharing{" "}
                <span className="whitespace-nowrap">your ideas.</span>
              </p>
            </div>
            <div className="flex w-full flex-col gap-3">
              <Link
                href="/auth/login"
                className={buttonVariants({
                  variant: "outline",
                  className: "w-full bg-white dark:bg-black",
                })}
              >
                Log in
              </Link>
              <Link
                href="/auth/sign-up"
                className={buttonVariants({
                  className: "w-full bg-white dark:bg-black",
                  variant: "outline",
                })}
              >
                Create account
              </Link>
            </div>
          </div>
        </div>
      )}

      {isDragging && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-white/60 dark:bg-black/60 backdrop-blur">
          <div className="flex flex-col items-center gap-4 text-black dark:text-white">
            <div className="text-7xl">+</div>
            <p className="text-xl font-semibold">Drop image to upload</p>
          </div>
        </div>
      )}

      <form
        onSubmit={form.handleSubmit((values) => onSubmit(values, "published"), onInvalid)}
        className="flex flex-col gap-8 pb-16"
      >
        <div className="flex items-center justify-between gap-5">
          <Link href="/posts" className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" className="relative z-20">
              <ArrowLeft className="h-4 w-4" />
              All posts
            </Button>
          </Link>

          <div className="flex flex-wrap items-end justify-end gap-2">
            <Button
              disabled={isPending || draftPending}
              size="sm"
              type="button"
              className="shrink-0"
              onClick={form.handleSubmit((values) => onSubmit(values, "draft"), onInvalid)}
            >
              {draftPending && <Loader2 className="size-4 animate-spin" />}
              <span className="flex items-center gap-2">
                Save as Draft <BookDashed className="size-4" />
              </span>
            </Button>

            <Button
              disabled={isPending || draftPending}
              size="sm"
              type="submit"
              className="shrink-0"
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              <span className="flex items-center gap-2">
                Publish Post <Book className="size-4" />
              </span>
            </Button>
          </div>
        </div>

        <article className="flex flex-col gap-8">
          <header className="flex flex-col gap-4">
            <Controller
              name="title"
              control={form.control}
              render={() => (
                <div className="relative space-y-3">
                  <div
                    aria-label="title"
                    contentEditable
                    onFocus={() => setIsMetaEditing(true)}
                    onBlur={() => setIsMetaEditing(false)}
                    suppressContentEditableWarning
                    role="textbox"
                    aria-multiline="true"
                    data-placeholder="What's the subject?"
                    className={cn(
                      "w-full bg-transparent outline-none text-3xl sm:text-4xl font-bold tracking-tight text-black dark:text-white",
                      "leading-tight whitespace-pre-wrap wrap-break-word",
                      visibleErrors.title && "text-[#CB2A2E] dark:text-[#FF6166]"
                    )}
                    onInput={(e) => {
                      const el = e.currentTarget;
                      let text = el.innerText.replace(/\n/g, "").trim();
                      if (!text) {
                        el.innerHTML = "";
                        text = "";
                      }
                      form.setValue("title", text, { shouldValidate: true });
                      clearError("title");
                    }}
                  />
                  <EditorialError message={visibleErrors.title} />
                </div>
              )}
            />

            <Controller
              name="subtitle"
              control={form.control}
              render={() => (
                <div className="relative space-y-3">
                  <div
                    aria-label="subtitle"
                    contentEditable
                    onFocus={() => setIsMetaEditing(true)}
                    onBlur={() => setIsMetaEditing(false)}
                    suppressContentEditableWarning
                    role="textbox"
                    aria-multiline="true"
                    data-placeholder="What's your main idea?"
                    className={cn(
                      "w-full bg-transparent outline-none text-lg leading-relaxed text-paragraph",
                      "whitespace-pre-wrap wrap-break-word",
                      visibleErrors.subtitle && "text-[#CB2A2E] dark:text-[#FF6166]"
                    )}
                    onInput={(e) => {
                      const el = e.currentTarget;
                      let text = el.innerText.replace(/\n/g, "").trim();
                      if (!text) {
                        el.innerHTML = "";
                        text = "";
                      }
                      form.setValue("subtitle", text, { shouldValidate: true });
                      clearError("subtitle");
                    }}
                  />
                  <EditorialError message={visibleErrors.subtitle} />
                </div>
              )}
            />

            <Separator className="my-4" />

            <div className="flex flex-wrap items-center justify-between sm:gap-14 text-[11px] sm:text-sm text-paragraph">
              <div className="flex flex-col items-center gap-2 text-black dark:text-white">
                <User className="size-4 sm:size-5" />
                <p>{user?.name || ""}</p>
              </div>
              <div className="flex flex-col items-center gap-2 text-black dark:text-white">
                <Calendar className="size-4 sm:size-5" />
                <p>{new Date().toLocaleDateString("en-US")}</p>
              </div>
              <Controller
                name="topic"
                control={form.control}
                render={({ field }) => {
                  return (
                    <div className="flex flex-col items-center gap-2">
                      <BookType className="size-4 sm:size-5 text-black dark:text-white" />

                      <Popover open={isTopicOpen} onOpenChange={setIsTopicOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "inline-flex cursor-pointer items-center px-1.5 sm:px-2.5 py-0.5 rounded-full font-medium bg-primary/10 text-primary transition hover:bg-primary/20",
                              visibleErrors.topic && "ring-1 ring-[#CB2A2E]"
                            )}
                          >
                            {field.value || "Choose topic"}
                          </button>
                        </PopoverTrigger>

                        <PopoverContent className="p-2 rounded-xl bg-white dark:bg-black border border-[#EAEAEA] dark:border-[#1E1E1E] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95">
                          <div className="flex flex-col items-center gap-2">
                            {TOPIC_OPTIONS.map((topic) => (
                              <button
                                key={topic}
                                type="button"
                                onClick={() => {
                                  field.onChange(topic);
                                  clearError("topic");
                                  setIsTopicOpen(false);
                                }}
                                className={`text-center w-fit text-[11px] sm:text-sm px-1.5 sm:px-2.5 py-0.5 rounded-full font-medium text-sm cursor-pointer bg-primary/10 text-primary hover:bg-primary/20 ${field.value === topic ? "ring-1 ring-primary" : ""}`}
                              >
                                {topic}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>

                      <EditorialError
                        message={visibleErrors.topic}
                        className="text-xs text-center"
                      />
                    </div>
                  );
                }}
              />
              <Controller
                name="minRead"
                control={form.control}
                render={({ field }) => (
                  <div className="flex flex-col items-center gap-2 text-black dark:text-white">
                    <ClockFading className="size-4 sm:size-5" />
                    {isMinReadEditing ? (
                      <>
                        <label htmlFor="minutes-read" className="sr-only">
                          Min read
                        </label>

                        <input
                          id="minutes-read"
                          aria-label="minutes read"
                          type="number"
                          min="1"
                          max="30"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.currentTarget.blur();
                              setIsMinReadEditing(false);
                            }
                            // prevent non-numeric characters like "e", "+", "-"
                            if (["e", "E", "+", "-", "."].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            // allow empty while typing
                            if (raw === "") {
                              field.onChange("");
                              return;
                            }
                            let value = Number(raw);
                            // ignore invalid numbers (like "e", "-", etc.)
                            if (isNaN(value)) return;
                            // clamp immediately
                            value = clamp(value, 1, 30);
                            field.onChange(value);
                            clearError("minRead");
                          }}
                          onBlur={() => {
                            let value = Number(field.value);
                            if (!value || isNaN(value)) value = 5;
                            field.onChange(clamp(value, 1, 30));
                            setIsMinReadEditing(false);
                          }}
                          className="w-[61px] sm:w-20 text-center bg-[#EDEDED] dark:bg-[#0A0A0A] outline-none rounded-md no-spinner"
                        />
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsMinReadEditing(true)}
                        className="w-[61px] sm:w-20 hover:opacity-70 transition cursor-pointer"
                      >
                        {field.value || 5} min read
                      </button>
                    )}

                    <EditorialError
                      message={visibleErrors.minRead}
                      className="text-xs text-center"
                    />
                  </div>
                )}
              />
              <CopySlugButton slug={slugPreview} />
            </div>
          </header>

          <Controller
            name="image"
            control={form.control}
            render={({ field }) => (
              <section className="flex flex-col gap-3">
                <input
                  type="file"
                  accept="image/*"
                  id="image"
                  className="hidden"
                  onChange={(e) => {
                    field.onChange(e.target.files?.[0]);
                    clearError("image");
                  }}
                />

                <div
                  className={cn(
                    "relative mb-2 h-[280px] w-full overflow-hidden rounded-md shadow-sm sm:h-[380px]",
                    previewUrl
                      ? "bg-[#FAFAFA] dark:bg-[#0A0A0A]"
                      : "border border-dashed border-[#EAEAEA] bg-white dark:border-[#1E1E1E] dark:bg-black hover:bg-[#FAFAFA] dark:hover:bg-[#0A0A0A]"
                  )}
                >
                  {previewUrl ? (
                    <div className="relative flex w-full h-full p-6 border border-[#EAEAEA] dark:border-[#1E1E1E] bg-white dark:bg-black rounded-md">
                      <Image
                        src={previewUrl}
                        alt="Featured image preview"
                        width={700}
                        height={500}
                        loading="eager"
                        className="object-cover rounded-md"
                      />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                      <Upload className="size-6" />
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-black dark:text-white">
                          Upload a featured image
                        </p>
                        <p className="text-xs text-paragraph">
                          PNG, JPG, WebP, AVIF or TIFF up to 1MB
                        </p>
                      </div>
                    </div>
                  )}
                  <label
                    htmlFor="image"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        field.onChange(file);
                        clearError("image");
                      }
                    }}
                    className={`absolute inset-0 cursor-pointer ${field.value ? "max-w-fit mx-auto" : ""}`}
                  >
                    <div className="relative left-0 top-full px-10 mx-auto">
                      {field.value && (
                        <span className="relative bottom-12 flex items-center justify-center gap-2 rounded-full border border-[#EAEAEA] dark:border-[#1E1E1E] bg-white dark:bg-black px-4 py-2 text-xs font-medium text-black dark:text-white">
                          <Upload className="size-3.5" />
                          <p className="flex-1 min-w-0 truncate">{field.value.name}</p>
                          <p className="min-w-0 truncate">
                            {`${(field.value.size / 1024 / 1024).toFixed(2)}MB`}
                          </p>
                        </span>
                      )}
                    </div>
                  </label>
                </div>

                <EditorialError message={visibleErrors.image} />
              </section>
            )}
          />

          <>
            {hasMounted ? (
              <RichTextEditor
                name="content"
                id="content"
                isMetaEditing={isMetaEditing}
                value={form.watch("contentHtml")}
                hasError={!!visibleErrors.content}
                onChange={(text, html) => {
                  form.setValue("content", text, { shouldValidate: true });
                  form.setValue("contentHtml", html, { shouldValidate: true });
                  clearError("content");
                }}
                placeholder="Write your content here... Use the toolbar for formatting"
              />
            ) : (
              <div className="min-h-screen w-full bg-transparent" />
            )}

            <EditorialError message={visibleErrors.content} className="-mt-2" />
          </>
        </article>
      </form>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </>
  );
}
