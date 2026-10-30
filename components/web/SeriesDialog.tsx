"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

// Adds a post at the end of one of the author's series, or of a new one.
export function SeriesDialog({
  post,
  onClose,
}: {
  post: { _id: Id<"posts">; title: string; seriesId?: Id<"series"> } | null;
  onClose: () => void;
}) {
  const series = useQuery(api.reading.mySeries, post ? {} : "skip");
  const addToSeries = useMutation(api.reading.addToSeries);
  const [choice, setChoice] = useState<Id<"series"> | "new">("new");
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);

  const others = (series ?? []).filter((s) => s.id !== post?.seriesId);

  const confirm = async () => {
    if (!post) return;
    setPending(true);
    try {
      await addToSeries(choice === "new" ? { postId: post._id, title } : { postId: post._id, seriesId: choice });
      showSuccessToast("Added to the series");
      setTitle("");
      onClose();
    } catch (error) {
      showErrorToast(error instanceof ConvexError && typeof error.data === "string" ? error.data : "Couldn't add it");
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog open={post !== null} onOpenChange={(open) => !open && !pending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="type-heading">Add to a series</AlertDialogTitle>
          <AlertDialogDescription>
            “{post?.title}” becomes the next part. Readers see the parts in order on each post.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          {others.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setChoice(s.id)}
              aria-pressed={choice === s.id}
              className={cn(
                "flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                choice === s.id ? "bg-black text-white dark:bg-white dark:text-black" : "bg-black/5 hover:bg-black/10 dark:bg-white/10"
              )}
            >
              <span className="truncate">{s.title}</span>
              <span className="shrink-0 text-xs opacity-70">
                {s.parts.length} {s.parts.length === 1 ? "part" : "parts"}
              </span>
            </button>
          ))}
          <div
            className={cn(
              "rounded-xl px-3 py-2 transition-colors",
              choice === "new" ? "bg-black/5 dark:bg-white/10" : ""
            )}
            onClick={() => setChoice("new")}
          >
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onFocus={() => setChoice("new")}
              maxLength={60}
              placeholder="New series title"
              aria-label="New series title"
              className="input-underline"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void confirm()} disabled={pending || (choice === "new" && title.trim().length < 3)}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Add
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
