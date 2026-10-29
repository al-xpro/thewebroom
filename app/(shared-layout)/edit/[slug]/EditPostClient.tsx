"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Doc } from "@/convex/_generated/dataModel";
import { editPostSchema } from "@/app/schemas/blog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Book,
  BookDashed,
  CalendarClock,
  BookType,
  Calendar,
  Check,
  ClockFading,
  Copy,
  Loader2,
  Upload,
  User,
} from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import Footer from "@/components/web/Footer";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { FadeImage } from "@/components/ui/fade-image";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";
import { updatePostAction } from "@/app/actions";
import Link from "next/link";
import { generateSlug } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SchedulePicker, formatPublishAt } from "@/components/web/SchedulePicker";
import { FunctionReturnType } from "convex/server";
import { TOPICS, type Topic } from "@/convex/topics";

const TOPIC_OPTIONS = TOPICS;

type EditPostValues = z.infer<typeof editPostSchema>;
type EditPostFields = keyof EditPostValues;

type UserType = FunctionReturnType<typeof api.auth.getCurrentUser>;
interface EditPostClientProps {
  post: Doc<"posts">;
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

export function EditPostClient({ post, initialUser }: EditPostClientProps) {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const [isPending, setIsPending] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    (post as { imageUrl?: string }).imageUrl ?? null
  );
  const [isMetaEditing, setIsMetaEditing] = useState(false);
  const [draftPending, setDraftPending] = useState(false);
  const [isTopicOpen, setIsTopicOpen] = useState(false);
  const [isMinReadEditing, setIsMinReadEditing] = useState(false);

  const userQuery = useQuery(api.auth.getCurrentUser, isAuthenticated ? undefined : "skip");
  const user = userQuery ?? initialUser;

  // Track which fields currently have a visible error.
  // An error becomes visible only when the form is submitted.
  // It disappears the moment the user types in that field.
  const [visibleErrors, setVisibleErrors] = useState<Partial<Record<EditPostFields, string>>>({});

  const clearError = (field: EditPostFields) => {
    setVisibleErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const form = useForm<EditPostValues>({
    resolver: zodResolver(editPostSchema),
    defaultValues: {
      content: post.body,
      contentHtml: post.contentHtml ?? "",
      title: post.title,
      subtitle: post.subtitle ?? "",
      minRead: post.minRead ?? 5,
      topic: (post.topic ?? "Web Architecture") as Topic,
      image: undefined,
    },
  });

  const clamp = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
  };

  const schedulePost = useMutation(api.scheduledPosts.schedulePost);

  // Saves the changes as a draft, then schedules the post (#60).
  async function scheduleAt(publishAt: number) {
    await form.handleSubmit(async (values) => {
      setDraftPending(true);
      try {
        if (!post.slug) throw new Error("Post slug is missing");
        await updatePostAction(post._id, post.slug, values, post.imageStorageId, "draft");
        await schedulePost({ postId: post._id, publishAt });
        showSuccessToast(`Scheduled for ${formatPublishAt(publishAt)}`);
        router.push("/my-posts");
      } catch (error) {
        const data = (error as { data?: string }).data;
        showErrorToast(data ?? (error instanceof Error ? error.message : "Failed to schedule the post"));
      } finally {
        setDraftPending(false);
      }
    }, onInvalid)();
  }

  async function onSubmit(values: EditPostValues, status: "published" | "draft" = "published") {
    if (status === "draft") {
      setDraftPending(true);
    } else {
      setIsPending(true);
    }

    try {
      if (!post.slug) throw new Error("Post slug is missing");
      const response = await updatePostAction(post._id, post.slug, values, post.imageStorageId, status);
      const nextSlug = response.slug ?? post.slug;

      if (status === "draft") {
        showSuccessToast("Draft saved successfully!");
        router.push("/my-posts");
      } else {
        showSuccessToast("Post updated and published successfully!");
        router.push(`/posts/${nextSlug}`);
      }
    } catch (error) {
      showErrorToast(
        error instanceof Error
          ? error.message
          : status === "draft"
            ? "Failed to save draft"
            : "Failed to update post"
      );
    } finally {
      setIsPending(false);
      setDraftPending(false);
    }
  }

  // Called when the form fails validation on submit.
  // Populates visibleErrors with every field that failed.
  function onInvalid(fieldErrors: typeof form.formState.errors) {
    const messages: Partial<Record<EditPostFields, string>> = {};

    for (const key in fieldErrors) {
      if (key === "root") continue;

      const fieldName = key as EditPostFields;
      const error = fieldErrors[fieldName];

      if (error && "message" in error && typeof error.message === "string") {
        messages[fieldName] = error.message;
      }
    }

    setVisibleErrors(messages);
  }

  const imageFile = form.watch("image");
  const titleValue = form.watch("title");
  const generatedSlug = generateSlug(titleValue);
  const slugPreview = titleValue.trim()
    ? titleValue.trim() === post.title.trim()
      ? (post.slug ?? generatedSlug)
      : generatedSlug
    : "";

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl((post as { imageUrl?: string }).imageUrl ?? null);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile, post]);

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

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    // Get only the plain text version of the clipboard content
    const text = e.clipboardData.getData("text/plain");
    // Insert it manually at the cursor position
    document.execCommand("insertText", false, text);
  };

  return (
    <>
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
          <Link href="/my-posts" className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" className="relative z-20">
              <ArrowLeft className="h-4 w-4" />
              Posts
            </Button>
          </Link>

          <div className="flex flex-wrap items-end justify-end gap-2">
            <SchedulePicker onConfirm={scheduleAt}>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending || draftPending}
                className="shrink-0"
              >
                <span className="flex items-center gap-2">
                  Schedule… <CalendarClock className="size-4" />
                </span>
              </Button>
            </SchedulePicker>
            <Button
              disabled={isPending || draftPending}
              size="sm"
              type="button"
              className="shrink-0"
              onClick={form.handleSubmit((values) => onSubmit(values, "draft"), onInvalid)}
            >
              {draftPending && <Loader2 className="size-4 animate-spin" />}
              <span className="flex items-center gap-2">Draft <BookDashed className="size-4" /></span>
            </Button>

            <Button disabled={isPending || draftPending} size="sm" type="submit" className="shrink-0">
              {isPending && <Loader2 className="size-4 animate-spin" />}
              <span className="flex items-center gap-2">
                Publish <Book className="size-4" />
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
                    ref={(el) => {
                      if (el && !el.innerText) {
                        el.innerText = form.getValues("title") || "";
                      }
                    }}
                    contentEditable
                    onPaste={handlePaste}
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
                    onPaste={handlePaste}
                    ref={(el) => {
                      if (el && !el.innerText) {
                        el.innerText = form.getValues("subtitle") || "";
                      }
                    }}
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
                  {previewUrl && (
                    <div className="relative flex w-full h-full p-6 border border-[#EAEAEA] dark:border-[#1E1E1E] bg-white dark:bg-black rounded-md">
                      <FadeImage
                        src={previewUrl}
                        alt="Featured image preview"
                        fill
                        sizes="100%"
                        loading="eager"
                        className="object-cover rounded-4xl p-6"
                      />
                    </div>
                  )}

                  {/* This label now covers 100% of the area */}
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
                    className="absolute inset-0 cursor-pointer flex flex-col items-center justify-end pb-12"
                  >
                    {/* Badge logic positioned at the bottom center */}
                    <div className="px-10 w-full flex justify-center">
                      {field.value instanceof File ? (
                        <span className="flex items-center gap-2 rounded-full border border-[#EAEAEA] dark:border-[#1E1E1E] bg-white dark:bg-black px-4 py-2 text-xs font-medium text-black dark:text-white shadow-xl">
                          <Upload className="size-3.5" />
                          <p className="max-w-[200px] truncate">{field.value.name}</p>
                          <p className="shrink-0">
                            {`${(field.value.size / 1024 / 1024).toFixed(2)}MB`}
                          </p>
                        </span>
                      ) : previewUrl ? (
                        <span className="flex items-center gap-2 rounded-full border border-[#EAEAEA] dark:border-[#1E1E1E] bg-white dark:bg-black px-6 py-2 text-xs font-medium text-black dark:text-white shadow-xl">
                          <Upload className="size-3.5" />
                          <p>Click or drag to replace</p>
                        </span>
                      ) : (
                        /* Empty state icon when no image exists at all */
                        <div className="flex flex-col items-center gap-3 text-center mb-24">
                          <Upload className="size-6 text-paragraph" />
                          <div className="space-y-1">
                            <p className="text-base font-semibold text-black dark:text-white">
                              Upload a featured image
                            </p>
                            <p className="text-xs text-paragraph">PNG, JPG, WebP up to 1MB</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
                <EditorialError message={visibleErrors.image} />
              </section>
            )}
          />

          <>
            <RichTextEditor
              name="content"
              id="content"
              isMetaEditing={isMetaEditing}
              value={form.watch("contentHtml")}
              hasError={!!visibleErrors.content}
              onChange={(text, html) => {
                form.setValue("content", text, { shouldValidate: false });
                form.setValue("contentHtml", html, {
                  shouldValidate: false,
                  shouldDirty: true,
                });
                clearError("content");
                clearError("contentHtml");
              }}
              placeholder="Write something worth reading."
            />

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
