"use client";

import { Loader2, Edit2, Trash2, MessagesSquare, ArrowUp, Reply } from "lucide-react";
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

type Comment = {
  _id: Id<"comments">;
  _creationTime: number;
  authorAvatarUrl?: string | null;
  body: string;
  authorId: string;
  authorName: string;
  postId: Id<"posts">;
  parentId?: Id<"comments">;
};

function counterColor(current: number, max: number) {
  if (current > max) return "text-[#CB2A2E] dark:text-[#FF6166]";
  if (current > max * 0.8) return "text-amber-500";
  return "text-paragraph";
}

// ── Comment form ──────────────────────────────────────────────────────────────

function CommentForm({
  onSubmit,
  onCancel,
  placeholder = "Share your thoughts",
  isPending,
  replyingTo,
}: {
  onSubmit: (body: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  isPending: boolean;
  replyingTo?: string;
}) {
  const [value, setValue] = useState(replyingTo ? `@${replyingTo} ` : "");
  const [error, setError] = useState<string | undefined>();

  const handle = () => {
    if (!value.trim()) {
      setError("Comment cannot be empty");
      return;
    }
    if (value.length > COMMENT_MAX) {
      setError("Comment is too long");
      return;
    }
    onSubmit(value);
    setValue("");
    setError(undefined);
  };

  return (
    <div className="w-full space-y-2">
      <div
        className={`rounded-xl overflow-hidden bg-white dark:bg-black border transition-all
        ${
          error
            ? "border-[#CB2A2E] dark:border-[#FF6166] ring-3 ring-[#FFE6E6] dark:ring-[#561A1E]"
            : "border-transparent focus-within:ring-3 focus-within:ring-[#ffc7bb] dark:focus-within:ring-[#660900] focus-within:border-[#FF3400]"
        }`}
      >
        <label htmlFor="comment-body" className="sr-only">
          Comment body
        </label>
        <Textarea
          id="comment-body"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(undefined);
          }}
          placeholder={placeholder}
          rows={3}
          maxLength={COMMENT_MAX}
          className="break-word"
          autoFocus
        />
        <div className="flex items-center justify-between px-3 py-2 border-t border-[#EAEAEA] dark:border-[#1E1E1E] gap-1">
          <span
            className={`text-xs tabular-nums transition-colors ${counterColor(value.length, COMMENT_MAX)}`}
          >
            {value.length} / {COMMENT_MAX}
          </span>
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button size="sm" variant="secondary" type="button" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              size="icon"
              type="button"
              aria-label="submit"
              disabled={isPending || !value.trim() || value.length > COMMENT_MAX}
              onClick={handle}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowUp className="size-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
      {error && <FieldError errors={[{ message: error }]} />}
    </div>
  );
}

// ── Single comment row (no reply form inside) ─────────────────────────────────

function CommentRow({
  comment,
  postAuthorId,
  currentUserId,
  isAdmin,
  onReply,
  onEdit,
  onDelete,
  editingId,
  editText,
  setEditText,
  editError,
  isPending,
  onEditSave,
  onEditCancel,
}: {
  comment: Comment;
  postAuthorId: string;
  currentUserId?: string;
  isAdmin: boolean;
  onReply: (id: Id<"comments">, name: string) => void;
  onEdit: (id: Id<"comments">, body: string) => void;
  onDelete: (id: Id<"comments">) => void;
  editingId: Id<"comments"> | null;
  editText: string;
  setEditText: (v: string) => void;
  editError?: string;
  isPending: boolean;
  onEditSave: (id: Id<"comments">) => void;
  onEditCancel: () => void;
}) {
  const isOwner = currentUserId === comment.authorId;
  const canEdit = isOwner || isAdmin;

  return (
    <div className="flex gap-4">
      <Avatar className="size-10 shrink-0">
        <AvatarImage
          src={comment.authorAvatarUrl ?? `https://avatar.vercel.sh/${comment.authorName}`}
          alt={comment.authorName}
        />
        <AvatarFallback>{comment.authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        {editingId === comment._id ? (
          <div className="space-y-2">
            <div
              className={`rounded-xl overflow-hidden bg-white dark:bg-black border transition-all
              ${
                editError
                  ? "border-[#CB2A2E] dark:border-[#FF6166] ring-3 ring-[#FFE6E6] dark:ring-[#561A1E]"
                  : "border-transparent focus-within:ring-3 focus-within:ring-[#ffc7bb] dark:focus-within:ring-[#660900] focus-within:border-[#FF3400]"
              }`}
            >
              <label htmlFor="comment-edit-body" className="sr-only">
                Edit comment body
              </label>
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Edit your comment"
                rows={3}
                maxLength={COMMENT_MAX}
                className="break-word"
                autoFocus
                id="comment-edit-body"
              />
              <div className="px-3 py-2 border-t border-[#EAEAEA] dark:border-[#1E1E1E]">
                <span
                  className={`text-xs tabular-nums ${counterColor(editText.length, COMMENT_MAX)}`}
                >
                  {editText.length} / {COMMENT_MAX}
                </span>
              </div>
            </div>
            {editError && <FieldError errors={[{ message: editError }]} />}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                type="button"
                onClick={() => onEditSave(comment._id)}
                disabled={isPending || editText.length > COMMENT_MAX}
              >
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Save
              </Button>
              <Button size="sm" variant="secondary" type="button" onClick={onEditCancel}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1 gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <p className="font-semibold text-sm truncate">{comment.authorName}</p>
                {comment.authorId === postAuthorId && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                    Author
                  </span>
                )}
              </div>
              <p className="text-paragraph text-xs truncate">
                {formatDistanceToNow(new Date(comment._creationTime), { addSuffix: false })}
              </p>
            </div>

            <p className="text-sm text-foreground/90 whitespace-pre-wrap break-word leading-relaxed mb-2">
              {comment.body}
            </p>

            <div className="flex items-center gap-0.5">
              {currentUserId && (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="reply"
                  type="button"
                  onClick={() => onReply(comment._id, comment.authorName)}
                  className="hover:bg-white dark:hover:bg-black hover:text-black dark:hover:text-white"
                >
                  <Reply className="size-4" />
                </Button>
              )}
              {canEdit && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="edit"
                    type="button"
                    onClick={() => onEdit(comment._id, comment.body)}
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
                        type="button"
                        className="hover:bg-[#DA2E34] dark:hover:bg-[#D93036] hover:text-white"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete comment?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel variant="secondary">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(comment._id)}
                          variant="destructive"
                          className="h-8.5!"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CommentSection(props: {
  preloadedComments: Preloaded<typeof api.comment.getCommentsByPostId>;
  postId: Id<"posts">;
  postAuthorId: string;
}) {
  const data = usePreloadedQuery(props.preloadedComments) as Comment[];
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();

  const [editingId, setEditingId] = useState<Id<"comments"> | null>(null);
  const [editText, setEditText] = useState("");
  const [editVisibleError, setEditVisibleError] = useState<string | undefined>();

  // anchorId = which comment the form appears after visually
  // parentId = what gets stored as parentId (always the root)
  const [replyAnchorId, setReplyAnchorId] = useState<Id<"comments"> | null>(null);
  const [replyParentId, setReplyParentId] = useState<Id<"comments"> | null>(null);
  const [replyToName, setReplyToName] = useState("");

  const [visibleErrors, setVisibleErrors] = useState<{ body?: string }>({});

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
        setVisibleErrors({ body: error instanceof Error ? error.message : "Failed to post" });
      }
    });
  }

  function onInvalid(fieldErrors: typeof form.formState.errors) {
    setVisibleErrors({ body: fieldErrors.body?.message });
  }

  async function handleReplySubmit(body: string) {
    if (!replyParentId) return;
    startSubmit(async () => {
      try {
        await createComment({ body, postId: props.postId, parentId: replyParentId });
        setReplyAnchorId(null);
        setReplyParentId(null);
        setReplyToName("");
        showSuccessToast("Reply posted");
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : "Failed to post reply");
      }
    });
  }

  async function handleEditSave(commentId: Id<"comments">) {
    const result = commentSchema.safeParse({ body: editText, postId: props.postId });
    if (!result.success) {
      setEditVisibleError(result.error.flatten().fieldErrors.body?.[0] ?? "Invalid comment");
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
        showErrorToast(error instanceof Error ? error.message : "Failed to update");
      }
    });
  }

  async function handleDelete(commentId: Id<"comments">) {
    startTransition(async () => {
      try {
        await deleteComment({ commentId });
        showSuccessToast("Comment deleted");
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : "Failed to delete");
      }
    });
  }

  const cancelReply = () => {
    setReplyAnchorId(null);
    setReplyParentId(null);
    setReplyToName("");
  };

  // sort ascending (oldest first) for both top-level and replies
  const topLevel = (data?.filter((c) => !c.parentId) ?? []).sort(
    (a, b) => a._creationTime - b._creationTime
  );

  const repliesMap = (data ?? []).reduce<Record<string, Comment[]>>((acc, c) => {
    if (c.parentId) {
      const key = c.parentId as string;
      if (!acc[key]) acc[key] = [];
      acc[key].push(c);
    }
    return acc;
  }, {});

  const sharedRowProps = {
    postAuthorId: props.postAuthorId,
    currentUserId: currentUser?._id,
    isAdmin: isAdminUser,
    editingId,
    editText,
    setEditText,
    editError: editVisibleError,
    isPending,
    // opening edit closes any open reply, opening reply closes any open edit
    onEdit: (id: Id<"comments">, body: string) => {
      setEditingId(id);
      setEditText(body);
      setEditVisibleError(undefined);
      cancelReply();
    },
    onEditSave: handleEditSave,
    onEditCancel: () => {
      setEditingId(null);
      setEditText("");
      setEditVisibleError(undefined);
    },
    onReply: (id: Id<"comments">, name: string) => {
      setEditingId(null);
      setEditText("");
      setEditVisibleError(undefined);
      const clicked = data.find((c) => c._id === id);
      // anchor form to this comment visually
      setReplyAnchorId(id);
      // parentId always points to root so replies don't nest deeper
      setReplyParentId((clicked?.parentId ?? id) as Id<"comments">);
      setReplyToName(name);
    },
    onDelete: handleDelete,
  };

  if (data === undefined) return <p>loading...</p>;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center text-black dark:text-white gap-2">
        <MessagesSquare className="size-5" />
        <h2 className="text-xl font-bold">{data.length} Comments</h2>
      </CardHeader>

      <CardContent className="space-y-8">
        {!isLoading && !isAuthenticated ? (
          <div className="rounded-lg border border-primary bg-primary/10 p-6 text-center">
            <p className="text-md text-paragraph">You need to be signed in to leave a comment.</p>
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
                    className={`rounded-xl overflow-hidden bg-white dark:bg-black border transition-all
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
                          isSubmitting || !field.value?.trim() || field.value.length > COMMENT_MAX
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
                  {visibleErrors.body && <FieldError errors={[{ message: visibleErrors.body }]} />}
                </Field>
              )}
            />
          </form>
        )}

        {topLevel.length > 0 && <Separator />}

        <section className="space-y-6">
          {topLevel.map((comment) => {
            const replies = (repliesMap[comment._id as string] ?? []).sort(
              (a, b) => a._creationTime - b._creationTime
            );

            const replyFormAfterRoot = replyAnchorId === comment._id;

            return (
              <div key={comment._id} className="space-y-3">
                {/* Root comment */}
                <CommentRow comment={comment} {...sharedRowProps} />

                {replyFormAfterRoot && (
                  <div className="ml-14">
                    <CommentForm
                      replyingTo={replyToName}
                      onSubmit={handleReplySubmit}
                      onCancel={cancelReply}
                      isPending={isSubmitting}
                    />
                  </div>
                )}

                {/* Reply thread */}
                {replies.length > 0 && (
                  <div className="ml-6 space-y-3">
                    {replies.map((reply) => {
                      const replyFormAfterThis = replyAnchorId === reply._id;
                      const isUserAuthenticated = isAuthenticated && !!currentUser;
                      return (
                        <div key={reply._id} className="space-y-3">
                          <div className="flex gap-3">
                            {/* Line connector */}
                            <div className="relative shrink-0 w-5 self-stretch">
                              {!isUserAuthenticated ? (
                                <>
                                  <div className="absolute -top-4 -left-2 w-8 h-10 border-l-2 border-[#EAEAEA] dark:border-[#1E1E1E] rounded-bl-full" />
                                  <div className="absolute -top-2 -left-2 h-16 border-l-2 border-[#EAEAEA] dark:border-[#1E1E1E]" />
                                </>
                              ) : (
                                <>
                                  <div className="absolute -top-4 -left-2 w-8 h-10 border-l-2 border-[#EAEAEA] dark:border-[#1E1E1E] rounded-bl-full" />
                                  <div className="absolute -top-12 -left-2 h-34 border-l-2 border-[#EAEAEA] dark:border-[#1E1E1E]" />
                                </>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <CommentRow comment={reply} {...sharedRowProps} />
                            </div>
                          </div>

                          {replyFormAfterThis && (
                            <div className="ml-8">
                              <CommentForm
                                replyingTo={replyToName}
                                onSubmit={handleReplySubmit}
                                onCancel={cancelReply}
                                isPending={isSubmitting}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
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
