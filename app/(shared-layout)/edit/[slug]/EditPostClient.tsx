"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { editPostSchema } from "@/app/schemas/blog";
import { Button } from "@/components/ui/button";
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
import { Loader2, Upload } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import Footer from "@/components/web/Footer";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import Image from "next/image";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";

interface EditPostClientProps {
  post: Doc<"posts">;
}

export function EditPostClient({ post }: EditPostClientProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Track which fields currently have a visible error.
  // An error becomes visible only when the form is submitted.
  // It disappears the moment the user types in that field.
  const [visibleErrors, setVisibleErrors] = useState<
    Partial<Record<keyof z.infer<typeof editPostSchema>, string>>
  >({});

  const clearError = (field: keyof z.infer<typeof editPostSchema>) => {
    setVisibleErrors((prev) => {
      if (!prev[field]) return prev; // nothing to clear
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const updatePost = useMutation(api.posts.updatePost);
  const generateUploadUrl = useMutation(api.posts.generateImageUploadUrl);

  const form = useForm<z.infer<typeof editPostSchema>>({
    resolver: zodResolver(editPostSchema),
    defaultValues: {
      content: post.body,
      contentHtml: post.contentHtml ?? "",
      title: post.title,
      subtitle: post.subtitle ?? "",
      minRead: post.minRead ?? 5,
      topic: (post.topic ?? "Web Architecture") as
        | "Web Architecture"
        | "UI Engineering"
        | "AI for Developers"
        | "Productivity",
      image: undefined,
    },
  });

  async function onSubmit(values: z.infer<typeof editPostSchema>) {
    setIsPending(true);
    try {
      let imageStorageId = post.imageStorageId;

      if (values.image) {
        const imageUrl = await generateUploadUrl({});
        const uploadResult = await fetch(imageUrl, {
          method: "POST",
          headers: { "Content-Type": values.image.type },
          body: values.image,
        });
        if (!uploadResult.ok) {
          throw new Error(`Failed to upload image: ${uploadResult.statusText}`);
        }
        const result = await uploadResult.json();
        imageStorageId = result.storageId;
      }

      await updatePost({
        postId: post._id,
        title: values.title,
        body: values.content,
        subtitle: values.subtitle,
        minRead: values.minRead,
        contentHtml: values.contentHtml,
        imageStorageId,
        topic: values.topic,
      });

      showSuccessToast("Post updated successfully!");
      router.push("/my-posts");
    } catch (error) {
      console.error("[editPost] Error:", error);
      showErrorToast(error instanceof Error ? error.message : "Failed to update post");
    } finally {
      setIsPending(false);
    }
  }

  type PostFields = keyof z.infer<typeof editPostSchema>;

  // Called when the form fails validation on submit.
  // Populates visibleErrors with every field that failed.
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

  const imageFile = form.watch("image");
  const previewUrl = imageFile ? URL.createObjectURL(imageFile) : (post as any).imageUrl;

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
      if (file) form.setValue("image", file);
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
          {/* Pass onInvalid as the second argument — it fires when validation fails */}
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
            <FieldGroup className="gap-y-6">
              {/* Title */}
              <Controller
                name="title"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="title">Title</FieldLabel>
                    <Input
                      {...field}
                      id="title"
                      name="title"
                      aria-invalid={!!visibleErrors.title}
                      placeholder="What's the subject?"
                      className="bg-white dark:bg-black"
                      onChange={(e) => {
                        field.onChange(e);
                        clearError("title");
                      }}
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
                    <FieldLabel htmlFor="subtitle">Subtitle</FieldLabel>
                    <Input
                      {...field}
                      id="subtitle"
                      name="subtitle"
                      aria-invalid={!!visibleErrors.subtitle}
                      placeholder="What's your main idea?"
                      className="bg-white dark:bg-black"
                      onChange={(e) => {
                        field.onChange(e);
                        clearError("subtitle");
                      }}
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
                        <FieldLabel htmlFor="minRead">Minutes Read</FieldLabel>
                        <Input
                          aria-invalid={!!visibleErrors.minRead}
                          type="number"
                          id="minRead"
                          min="1"
                          max="30"
                          placeholder="Estimated reading time in minutes"
                          className="bg-white dark:bg-black"
                          {...field}
                          name="minRead"
                          onChange={(e) => {
                            field.onChange(Number(e.target.value));
                            clearError("minRead");
                          }}
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
                        <FieldLabel htmlFor="topic">Topic</FieldLabel>
                        <Select
                          value={field.value}
                          name="topic"
                          onValueChange={(v) => {
                            field.onChange(v);
                            clearError("topic");
                          }}
                        >
                          <SelectTrigger aria-invalid={!!visibleErrors.topic} id="topic">
                            <SelectValue placeholder="Select a topic" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Web Architecture">Web Architecture</SelectItem>
                            <SelectItem value="UI Engineering">UI Engineering</SelectItem>
                            <SelectItem value="AI for Developers">AI for Developers</SelectItem>
                            <SelectItem value="Productivity">Productivity</SelectItem>
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
                    <FieldLabel htmlFor="image">Featured Image</FieldLabel>
                    <div className="relative flex flex-col-reverse sm:flex-row w-full h-full items-center justify-center gap-2 sm:gap-5">
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
                        className="flex items-center justify-center w-full sm:w-1/2 h-9 sm:h-[220px] px-4 rounded-md border border-input bg-white dark:bg-black hover:bg-[#FAFAFA] dark:hover:bg-[#1E1E1E] text-sm cursor-pointer transition"
                      >
                        {!field.value ? (
                          /* EMPTY STATE — centered */
                          <div className="flex w-full items-center justify-center gap-2">
                            <Upload className="size-4 text-black dark:text-white" />
                            <p className="text-black dark:text-white">Upload image</p>
                          </div>
                        ) : (
                          /* FILE SELECTED — normal layout */
                          <div className="flex w-full min-w-0 items-center gap-4">
                            <Upload className="size-4 shrink-0 text-black dark:text-white" />

                            <p className="flex-1 min-w-0 truncate text-black dark:text-white text-left">
                              {field.value.name}
                            </p>

                            <p className="shrink-0 text-black dark:text-white text-sm">
                              {(field.value.size / 1024 / 1024).toFixed(1)}MB
                            </p>
                          </div>
                        )}
                      </label>
                    </div>
                    {visibleErrors.image && (
                      <FieldError errors={[{ message: visibleErrors.image }]} />
                    )}
                  </Field>
                )}
              />

              {/* Content / RichTextEditor */}
              <Controller
                name="contentHtml"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel id="content-label" htmlFor="content">
                      Content
                    </FieldLabel>
                    <input id="content" name="content" hidden readOnly />
                    <RichTextEditor
                      aria-labelledby="content-label"
                      aria-describedby="content-label"
                      name="content"
                      value={field.value}
                      hasError={!!visibleErrors.contentHtml}
                      onChange={(text, html) => {
                        form.setValue("content", text);
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
                {isPending && <Loader2 className="size-4 animate-spin" />}
                <span>Save Changes</span>
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
