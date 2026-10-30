"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import type { Node as PMNode } from "@tiptap/pm/model";
import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Sparkles, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { showErrorToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  assistSelectionAction,
  reviewDraftAction,
  type AssistantAction,
  type ReviewSuggestion,
} from "@/app/assistant-actions";

// The agent toolbar in the editor: a menu on selected text (clarify, shorten, fix,
// explain) and a review of the whole draft before publishing. Nothing changes until the
// writer accepts a suggestion; accepting one marks the post as AI-assisted.

const ACTIONS: { id: AssistantAction; label: string }[] = [
  { id: "clarify", label: "Clarify" },
  { id: "shorten", label: "Shorten" },
  { id: "fix", label: "Fix" },
  { id: "explain", label: "Explain" },
];

// Replaces a range with plain text; blank lines become paragraphs.
function replaceRange(editor: Editor, from: number, to: number, text: string) {
  const paragraphs = text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const content =
    paragraphs.length <= 1
      ? { type: "text", text: paragraphs[0] ?? text }
      : paragraphs.map((part) => ({ type: "paragraph", content: [{ type: "text", text: part }] }));
  editor.chain().focus().insertContentAt({ from, to }, content).run();
}

// Where an exact quote sits in the document, within one block.
function findText(doc: PMNode, needle: string): { from: number; to: number } | null {
  let found: { from: number; to: number } | null = null;
  doc.descendants((node, pos) => {
    if (found) return false;
    if (!node.isTextblock) return true;
    let text = "";
    const positions: number[] = [];
    node.forEach((child, offset) => {
      const start = pos + 1 + offset;
      if (child.isText && child.text) {
        for (let i = 0; i < child.text.length; i++) positions.push(start + i);
        text += child.text;
      } else {
        positions.push(start);
        text += "￼";
      }
    });
    const index = text.indexOf(needle);
    if (index >= 0) found = { from: positions[index], to: positions[index + needle.length - 1] + 1 };
    return false;
  });
  return found;
}

function isInCode(editor: Editor) {
  const { $from } = editor.state.selection;
  return Boolean($from.parent.type.spec.code) || $from.parent.type.name.toLowerCase().includes("code");
}

type SelectionResult = { action: AssistantAction; text: string; from: number; to: number };

export function AgentSelectionMenu({ editor, onApplied }: { editor: Editor; onApplied?: () => void }) {
  const remaining = useQuery(api.assistant.remaining);
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState<AssistantAction | null>(null);
  const [result, setResult] = useState<SelectionResult | null>(null);
  // The menu stays open while it works and while a result waits for a decision.
  const busyRef = useRef(false);
  useEffect(() => {
    busyRef.current = pending || result !== null;
  }, [pending, result]);

  if (remaining === null) return null;

  const run = (action: AssistantAction) => {
    const { from, to } = editor.state.selection;
    const selection = editor.state.doc.textBetween(from, to, "\n\n");
    const $from = editor.state.doc.resolve(from);
    const context = $from.parent.textContent;
    setRunning(action);
    startTransition(async () => {
      const response = await assistSelectionAction({ action, selection, context });
      setRunning(null);
      if (!response.ok) {
        showErrorToast(response.error);
        return;
      }
      setResult({ action, text: response.value, from, to });
    });
  };

  const accept = () => {
    if (!result) return;
    replaceRange(editor, result.from, result.to, result.text);
    setResult(null);
    onApplied?.();
  };

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top", offset: 10 }}
      shouldShow={({ editor: current, from, to }) =>
        busyRef.current || (from !== to && current.isEditable && !isInCode(current as Editor))
      }
      className="z-50"
    >
      <div
        data-toolbar
        className={cn(
          "rounded-2xl border border-black/5 bg-white/95 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-black/95",
          result ? "w-[min(26rem,calc(100vw-2rem))] p-3" : "p-1"
        )}
      >
        {result ? (
          <div className="space-y-3">
            <p className="type-label">{ACTIONS.find((a) => a.id === result.action)?.label}</p>
            <p className="max-h-60 overflow-y-auto whitespace-pre-wrap text-sm font-light leading-relaxed">{result.text}</p>
            <div className="flex justify-end gap-1">
              <Button type="button" size="sm" variant="ghost" onClick={() => setResult(null)}>
                {result.action === "explain" ? "Close" : "Reject"}
              </Button>
              {result.action !== "explain" && (
                <Button type="button" size="sm" onClick={accept}>
                  Accept
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-0.5">
            <Sparkles aria-hidden className="mx-1.5 size-3.5 text-[#A0A0A0]" />
            {ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={pending || remaining === 0}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => run(action.id)}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10 cursor-pointer"
              >
                {running === action.id && <Loader2 className="size-3 animate-spin" />}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </BubbleMenu>
  );
}

type Review = { suggestion: ReviewSuggestion; state: "open" | "accepted" | "rejected" | "missing" };

export function AgentReviewBar({
  editor,
  title,
  subtitle,
  onApplied,
}: {
  editor: Editor;
  title?: string;
  subtitle?: string;
  onApplied?: () => void;
}) {
  const remaining = useQuery(api.assistant.remaining);
  const [pending, startTransition] = useTransition();
  const [reviews, setReviews] = useState<Review[] | null>(null);

  const review = () =>
    startTransition(async () => {
      const response = await reviewDraftAction({
        title: title ?? "",
        subtitle: subtitle ?? "",
        body: editor.state.doc.textBetween(0, editor.state.doc.content.size, "\n\n"),
      });
      if (!response.ok) {
        showErrorToast(response.error);
        return;
      }
      setReviews(response.value.map((suggestion) => ({ suggestion, state: "open" })));
    });

  const decide = (index: number, accept: boolean) => {
    if (!reviews) return;
    const item = reviews[index];
    let state: Review["state"] = accept ? "accepted" : "rejected";
    if (accept) {
      const range = findText(editor.state.doc, item.suggestion.before);
      if (range) {
        replaceRange(editor, range.from, range.to, item.suggestion.after);
        onApplied?.();
      } else {
        state = "missing";
      }
    }
    setReviews(reviews.map((current, i) => (i === index ? { ...current, state } : current)));
  };

  return (
    <div data-toolbar className="relative divider-fade-bottom mb-6 space-y-4 pb-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="inline-flex items-center gap-1.5 type-label">
          <Sparkles aria-hidden className="size-3.5" /> Assistant
        </span>
        <p className="type-meta flex-1 text-xs">
          {remaining === null
            ? "Sign in to use the assistant."
            : "Select text to clarify, shorten, fix or explain it, or review the whole draft."}
          {typeof remaining === "number" && ` ${remaining} left today.`}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending || !remaining}
          onClick={review}
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Review
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {reviews && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <p className="type-meta text-xs">
                {reviews.length === 0 ? "Nothing to change. Ready to publish." : `${reviews.length} suggestions`}
              </p>
              <button type="button" aria-label="Close review" onClick={() => setReviews(null)} className="cursor-pointer text-[#A0A0A0] hover:text-black dark:hover:text-white">
                <X className="size-4" />
              </button>
            </div>
            <ul>
              {reviews.map((item, index) => (
                <li key={index} className="relative divider-fade-top space-y-1.5 py-4">
                  <p className="type-label">{item.suggestion.kind}</p>
                  <p className="text-sm font-light text-[#A0A0A0] line-through dark:text-[#666666]">{item.suggestion.before}</p>
                  <p className="text-sm">{item.suggestion.after}</p>
                  <p className="type-meta text-xs">{item.suggestion.reason}</p>
                  <div className="-ml-3 flex gap-1 pt-1">
                    {item.state === "open" ? (
                      <>
                        <Button type="button" variant="ghost" size="sm" onClick={() => decide(index, true)}>
                          Accept
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => decide(index, false)}>
                          Reject
                        </Button>
                      </>
                    ) : (
                      <p className="type-meta pl-3 text-xs">
                        {item.state === "accepted"
                          ? "Applied."
                          : item.state === "missing"
                            ? "This text changed since the review."
                            : "Left as is."}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
