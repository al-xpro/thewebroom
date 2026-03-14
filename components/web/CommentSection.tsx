"use client";

import { Loader2, Edit2, Trash2, MessagesSquare, ArrowUp } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { commentSchema } from "@/app/schemas/comment";
import { Field, FieldError } from "../ui/field";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import z from "zod";
import { useTransition, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Separator } from "../ui/separator";
import { Preloaded, usePreloadedQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { showErrorToast, showSuccessToast } from "../ui/toast";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";

const COMMENT_MAX = 300;

export function CommentSection(props: {
  preloadedComments: Preloaded<typeof api.comment.getCommentsByPostId>;
  postId: Id<"posts">;
  postAuthorId: string;
}) {
  const data = usePreloadedQuery(props.preloadedComments);
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();
  const [editingId, setEditingId] = useState<Id<"comments"> | null>(null);
  const [editText, setEditText] = useState("");

  const [visibleErrors, setVisibleErrors] = useState<{ body?: string }>({});
  const [editVisibleError, setEditVisibleError] = useState<string | undefined>();

  const currentUser = useQuery(api.auth.getCurrentUser, isAuthenticated ? undefined : "skip");
  const isAdminUser =
    useQuery(api.comment.getIsAdmin, isAuthenticated ? undefined : "skip") ?? false;

  const createComment = useMutation(api.comment.createComment);
  const updateComment = useMutation(api.comment.updateComment);
  const deleteComment = useMutation(api.comment.deleteComment);

  const form = useForm<z.infer<typeof commentSchema>>({
    resolver: zodResolver(commentSchema),
    defaultValues: { body: "", postId: props.postId },
  });

  const bodyValue = form.watch("body") ?? "";

  async function onSubmit(values: z.infer<typeof commentSchema>) {
    startSubmit(async () => {
      try {
        await createComment(values);
        form.reset();
        setVisibleErrors({});
        showSuccessToast("Comment posted");
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Failed to create comment";
        setVisibleErrors({ body: msg });
      }
    });
  }

  function onInvalid(fieldErrors: typeof form.formState.errors) {
    setVisibleErrors({ body: fieldErrors.body?.message });
  }

  async function handleEditComment(commentId: Id<"comments">) {
    const result = commentSchema.safeParse({ body: editText, postId: props.postId });
    if (!result.success) {
      const msg =
        result.error.flatten().fieldErrors.body?.[0] ??
        result.error.flatten().formErrors[0] ??
        "Invalid comment";
      setEditVisibleError(msg);
      return;
    }

    startTransition(async () => {
      try {
        await updateComment({ commentId, body: editText });
        setEditingId(null);
        setEditText("");
        setEditVisibleError(undefined);
        showSuccessToast("Comment updated");
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : "Failed to update comment");
      }
    });
  }

  async function handleDeleteComment(commentId: Id<"comments">) {
    startTransition(async () => {
      try {
        await deleteComment({ commentId });
        showSuccessToast("Comment deleted");
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : "Failed to delete comment");
      }
    });
  }

  if (data === undefined) {
    return <p>loading...</p>;
  }

  // Character counter colour: red when over limit, amber when close (>80%), normal otherwise
  function counterColor(current: number, max: number) {
    if (current > max) return "text-[#CB2A2E] dark:text-[#FF6166]";
    if (current > max * 0.8) return "text-amber-500";
    return "text-paragraph";
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center text-black dark:text-white gap-2">
        <MessagesSquare className="size-5" />
        <h2 className="text-xl font-bold">{data.length} Comments</h2>
      </CardHeader>
      <CardContent className="space-y-8">
        {!isLoading && !isAuthenticated ? (
          <div className="rounded-lg border border-primary bg-primary/10 p-6 text-center space-y-4">
            <p className="text-md text-paragraph">
              You need to be signed in to leave a comment.
            </p>
          </div>
        ) : (
          <form className="relative" onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
            <Controller
              name="body"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <label
                    htmlFor="comment-body"
                    className="text-black dark:text-white font-bold cursor-text"
                  >
                    Start a conversation with the community
                  </label>

                  <div
                    className={`rounded-xl overflow-hidden bg-white dark:bg-black placeholder:text-paragraph border transition-all
                    ${
                      visibleErrors.body
                        ? "border-[#CB2A2E] dark:border-[#FF6166] ring-3 ring-[#FFE6E6] dark:ring-[#561A1E]"
                        : "border-transparent focus-within:ring-3 focus-within:ring-[#ffc7bb] dark:focus-within:ring-[#660900] focus-within:border-[#FF3400]"
                    }`}
                  >
                    <Textarea
                      {...field}
                      rows={5}
                      id="comment-body"
                      name="comment-body"
                      placeholder="Share your thoughts"
                      maxLength={COMMENT_MAX}
                      onChange={(e) => {
                        field.onChange(e);
                        if (visibleErrors.body) setVisibleErrors({});
                      }}
                    />

                    {/* Character counter + submit */}
                    <div className="flex items-center justify-between px-3 py-2 border-t border-[#EAEAEA] dark:border-[#1E1E1E]">
                      <span
                        className={`text-xs tabular-nums transition-colors ${counterColor(bodyValue.length, COMMENT_MAX)}`}
                      >
                        {bodyValue.length} / {COMMENT_MAX}
                      </span>
                      <Button
                        type="submit"
                        size="icon"
                        aria-label="publish"
                        disabled={
                          isSubmitting ||
                          !field.value?.trim() ||
                          field.value.length > COMMENT_MAX
                        }
                      >
                        {isSubmitting ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <ArrowUp className="size-5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {visibleErrors.body && (
                    <FieldError errors={[{ message: visibleErrors.body }]} />
                  )}
                </Field>
              )}
            />
          </form>
        )}

        {data?.length > 0 && <Separator />}

        <section className="space-y-6">
          {data?.map((comment) => {
            const isOwner = currentUser?._id === comment.authorId;
            const canEdit = isOwner || isAdminUser;

            return (
              <div key={comment._id}>
                {editingId === comment._id ? (
                  <div className="flex gap-4">
                    <Avatar className="size-10 shrink-0">
                      <AvatarImage
                        src={`https://avatar.vercel.sh/${comment.authorName}`}
                        alt={comment.authorName}
                      />
                      <AvatarFallback>
                        {comment.authorName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="w-full space-y-2">
                      <div
                        className={`rounded-xl overflow-hidden bg-white dark:bg-black border transition-all
                        ${
                          editVisibleError
                            ? "border-[#CB2A2E] dark:border-[#FF6166] ring-3 ring-[#FFE6E6] dark:ring-[#561A1E]"
                            : "border-transparent focus-within:ring-3 focus-within:ring-[#ffc7bb] dark:focus-within:ring-[#660900] focus-within:border-[#FF3400]"
                        }`}
                      >
                        <Textarea
                          value={editText}
                          name="edit-comment"
                          maxLength={COMMENT_MAX}
                          onChange={(e) => {
                            setEditText(e.target.value);
                            if (editVisibleError) setEditVisibleError(undefined);
                          }}
                          placeholder="Edit your comment"
                          rows={3}
                          className="break-all"
                        />
                        {/* Character counter for edit */}
                        <div className="px-3 py-2 border-t border-[#EAEAEA] dark:border-[#1E1E1E]">
                          <span
                            className={`text-xs tabular-nums ${counterColor(editText.length, COMMENT_MAX)}`}
                          >
                            {editText.length} / {COMMENT_MAX}
                          </span>
                        </div>
                      </div>
                      {editVisibleError && (
                        <FieldError errors={[{ message: editVisibleError }]} />
                      )}
                      <div className="flex items-center justify-start gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEditComment(comment._id)}
                          disabled={isPending || editText.length > COMMENT_MAX}
                          type="button"
                          variant="secondary"
                        >
                          {isPending && <Loader2 className="size-4 animate-spin" />}
                          <span>Save</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingId(null);
                            setEditVisibleError(undefined);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <Avatar className="size-10 shrink-0">
                      <AvatarImage
                        src={`https://avatar.vercel.sh/${comment.authorName}`}
                        alt={comment.authorName}
                      />
                      <AvatarFallback>
                        {comment.authorName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2 gap-5">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{comment.authorName}</p>
                          {comment.authorId === props.postAuthorId && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              Author
                            </span>
                          )}
                        </div>
                        <p className="flex text-paragraph text-xs">
                          {formatDistanceToNow(new Date(comment._creationTime), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>

                      <p className="text-sm text-foreground/90 whitespace-pre-wrap break-all leading-relaxed mb-3">
                        {comment.body}
                      </p>

                      {canEdit && (
                        <div className="flex items-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label="edit"
                            onClick={() => {
                              setEditingId(comment._id);
                              setEditText(comment.body);
                            }}
                            className="hover:bg-white dark:hover:bg-black hover:text-black dark:hover:text-white"
                          >
                            <Edit2 className="size-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                aria-label="delete"
                                className="hover:bg-[#DA2E34] dark:hover:bg-[#D93036] hover:text-white"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete comment?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently remove your
                                  comment.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel variant="secondary">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteComment(comment._id)}
                                  variant="destructive"
                                  className="h-8.5!"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </CardContent>
    </Card>
  );
}