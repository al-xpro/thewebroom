"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Loader2, Sparkles, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { showErrorToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  agentEditAction,
  reviewDraftAction,
  type AgentBlock,
  type AgentEdit,
  type ReviewSuggestion,
} from "@/app/assistant-actions";

// The agentic toolbar: the writer asks the agent in their own words, or picks one of the
// suggestions below, and gets a reply and a preview of the change to accept or reject.
// Accepting marks the post as AI-assisted.

type Suggestion = { label: string; prompt: string; send: boolean; selection?: boolean; review?: boolean };

const SUGGESTIONS: Suggestion[] = [
  { label: "Proofread selection", prompt: "Proofread the selection.", send: true, selection: true },
  { label: "Rewrite selection", prompt: "Rewrite the selection so it's clearer.", send: true, selection: true },
  { label: "Make it shorter", prompt: "Make the selection shorter, keeping what matters.", send: true, selection: true },
  { label: "New paragraph", prompt: "Write a new paragraph about ", send: false },
  { label: "New heading", prompt: "Write a heading for the next section about ", send: false },
  { label: "Code block", prompt: "Add a code block that ", send: false },
  { label: "Terminal block", prompt: "Add a terminal block that installs ", send: false },
  { label: "Table", prompt: "Add a table comparing ", send: false },
  { label: "Comment", prompt: "Add a short comment for the reader about ", send: false },
  { label: "Review the draft", prompt: "", send: true, review: true },
];

// ---- Blocks to the editor's own HTML (the same markup it saves) ----

function escapeHtml(text: string) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

// **bold**, *italic* and `code`, on escaped text.
function inline(text: string) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

const FILE_ICONS = new Set(["ts", "tsx", "js", "jsx", "json"]);

function blockToHtml(block: AgentBlock): string {
  switch (block.type) {
    case "paragraph":
      return `<p>${inline(block.text)}</p>`;
    case "heading":
      return `<h${block.level}>${inline(block.text)}</h${block.level}>`;
    case "list": {
      const tag = block.ordered ? "ol" : "ul";
      return `<${tag}>${block.items.map((item) => `<li><p>${inline(item)}</p></li>`).join("")}</${tag}>`;
    }
    case "code": {
      const icon = FILE_ICONS.has(block.language) ? block.language : "text";
      return `<pre data-type="file-code-block" data-show-header="true" data-filename="${escapeHtml(block.filename)}" data-language="${block.language}" data-file-icon="${icon}"><code class="language-${block.language}">${escapeHtml(block.code)}</code></pre>`;
    }
    case "terminal":
      return `<div data-type="terminal-block" data-show-header="true" data-package-manager="npm">${escapeHtml(block.command)}</div>`;
    case "table": {
      const head = `<tr>${block.header.map((cell) => `<th><p>${inline(cell)}</p></th>`).join("")}</tr>`;
      const rows = block.rows.map((row) => `<tr>${row.map((cell) => `<td><p>${inline(cell)}</p></td>`).join("")}</tr>`).join("");
      return `<table><tbody>${head}${rows}</tbody></table>`;
    }
    case "callout":
      return `<div data-callout>${inline(block.text)}</div>`;
  }
}

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

// After the top-level block that holds `pos`; an empty paragraph is replaced instead.
function blockRangeAfter(editor: Editor, pos: number): { from: number; to: number } {
  const doc = editor.state.doc;
  const $pos = doc.resolve(Math.min(pos, doc.content.size));
  if ($pos.depth === 0) return { from: pos, to: pos };
  const block = $pos.node(1);
  if (block.type.name === "paragraph" && block.content.size === 0) return { from: $pos.before(1), to: $pos.after(1) };
  return { from: $pos.after(1), to: $pos.after(1) };
}

type Pending = { request: string; from: number; to: number };
type Result =
  | { kind: "edit"; edit: AgentEdit; at: Pending; state: "open" | "accepted" | "rejected" }
  | { kind: "review"; items: { suggestion: ReviewSuggestion; state: "open" | "accepted" | "rejected" | "missing" }[] };

const PLACEMENT_LABEL: Record<AgentEdit["placement"], string> = {
  replace_selection: "Replaces the selection",
  after_selection: "Goes after the selection",
  at_cursor: "Goes at the cursor",
  end_of_document: "Goes at the end",
  none: "",
};

interface AgentChatProps {
  editor: Editor;
  title?: string;
  subtitle?: string;
  onApplied?: () => void;
  // Where the panel with suggestions and results opens, from the bar.
  panel: "above" | "below";
  className?: string;
}

export function AgentChat({ editor, title, subtitle, onApplied, panel, className }: AgentChatProps) {
  const remaining = useQuery(api.assistant.remaining);
  const [request, setRequest] = useState("");
  const [focused, setFocused] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [selectionSize, setSelectionSize] = useState(0);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // How much text is selected in the editor, shown next to the input.
  useEffect(() => {
    const update = () => {
      const { from, to } = editor.state.selection;
      setSelectionSize(to - from);
    };
    update();
    editor.on("selectionUpdate", update);
    return () => {
      editor.off("selectionUpdate", update);
    };
  }, [editor]);

  // Clicking elsewhere closes the suggestions (not a result waiting for a decision).
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setFocused(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const signedOut = remaining === null;
  const disabled = signedOut || remaining === 0 || pending;

  const send = (text: string) => {
    const { from, to } = editor.state.selection;
    const doc = editor.state.doc;
    const at: Pending = { request: text, from, to };
    const selection = doc.textBetween(from, to, "\n\n");
    const context = doc.resolve(from).parent.textContent;
    startTransition(async () => {
      const response = await agentEditAction({
        request: text,
        selection,
        context,
        document: doc.textBetween(0, doc.content.size, "\n\n"),
        title: title ?? "",
        subtitle: subtitle ?? "",
      });
      if (!response.ok) {
        showErrorToast(response.error);
        return;
      }
      setRequest("");
      setResult({ kind: "edit", edit: response.value, at, state: "open" });
    });
  };

  const review = () =>
    startTransition(async () => {
      const doc = editor.state.doc;
      const response = await reviewDraftAction({
        title: title ?? "",
        subtitle: subtitle ?? "",
        body: doc.textBetween(0, doc.content.size, "\n\n"),
      });
      if (!response.ok) {
        showErrorToast(response.error);
        return;
      }
      setResult({ kind: "review", items: response.value.map((suggestion) => ({ suggestion, state: "open" })) });
    });

  const pick = (suggestion: Suggestion) => {
    if (suggestion.review) return review();
    if (suggestion.selection && selectionSize === 0) {
      showErrorToast("Select some text in the post first.");
      return;
    }
    if (suggestion.send) return send(suggestion.prompt);
    setRequest(suggestion.prompt);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(suggestion.prompt.length, suggestion.prompt.length);
    });
  };

  const acceptEdit = () => {
    if (result?.kind !== "edit") return;
    const { edit, at } = result;
    const html = edit.blocks.map(blockToHtml).join("");
    const size = editor.state.doc.content.size;
    const from = Math.min(at.from, size);
    const to = Math.min(at.to, size);
    const range =
      edit.placement === "replace_selection"
        ? { from, to }
        : edit.placement === "after_selection"
          ? blockRangeAfter(editor, to)
          : edit.placement === "end_of_document"
            ? { from: size, to: size }
            : blockRangeAfter(editor, from);
    editor.chain().focus().insertContentAt(range, html).run();
    setResult({ ...result, state: "accepted" });
    onApplied?.();
    // The change is in the post now; the panel steps aside.
    setTimeout(() => setResult((current) => (current?.kind === "edit" && current.state === "accepted" ? null : current)), 1200);
  };

  const decideReview = (index: number, accept: boolean) => {
    if (result?.kind !== "review") return;
    const item = result.items[index];
    let state: "accepted" | "rejected" | "missing" = accept ? "accepted" : "rejected";
    if (accept) {
      const range = findText(editor.state.doc, item.suggestion.before);
      if (range) {
        replaceRange(editor, range.from, range.to, item.suggestion.after);
        onApplied?.();
      } else {
        state = "missing";
      }
    }
    setResult({ ...result, items: result.items.map((current, i) => (i === index ? { ...current, state } : current)) });
  };

  const showSuggestions = focused && !result && !pending;
  const open = showSuggestions || result !== null || pending;

  return (
    <div ref={rootRef} data-toolbar className={cn("relative w-full", className)}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: panel === "above" ? 8 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: panel === "above" ? 8 : -8 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute inset-x-0 z-50 max-h-[60svh] overflow-y-auto rounded-2xl border border-black/5 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-black",
              panel === "above" ? "bottom-full mb-3" : "top-full mt-3"
            )}
          >
            {pending && (
              <p className="type-meta flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" /> The agent is working…
              </p>
            )}

            {showSuggestions && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion.label}
                      type="button"
                      disabled={disabled}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => pick(suggestion)}
                      className={cn(
                        "rounded-full bg-black/5 px-3 py-1 text-xs cursor-pointer transition-colors hover:bg-black/10 disabled:cursor-default disabled:opacity-50 dark:bg-white/10 dark:hover:bg-white/15",
                        suggestion.selection && selectionSize === 0 && "opacity-50"
                      )}
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
                <p className="type-meta text-xs">
                  Select text to proofread, rewrite or shorten it; place the cursor where new content should go. Nothing
                  changes until you accept.
                  {typeof remaining === "number" && ` ${remaining} requests left today.`}
                </p>
              </div>
            )}

            {result?.kind === "edit" && !pending && (
              <EditResult
                edit={result.edit}
                request={result.at.request}
                state={result.state}
                onAccept={acceptEdit}
                onReject={() => setResult({ ...result, state: "rejected" })}
                onClose={() => setResult(null)}
              />
            )}

            {result?.kind === "review" && !pending && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="type-label">Review</p>
                  <CloseButton onClick={() => setResult(null)} />
                </div>
                {result.items.length === 0 && <p className="text-sm font-light">Nothing to change. Ready to publish.</p>}
                <ul>
                  {result.items.map((item, index) => (
                    <li key={index} className="relative divider-fade-top space-y-1.5 py-3">
                      <p className="type-label text-[10px]">{item.suggestion.kind}</p>
                      <p className="text-sm font-light text-[#A0A0A0] line-through dark:text-[#666666]">{item.suggestion.before}</p>
                      <p className="text-sm">{item.suggestion.after}</p>
                      <p className="type-meta text-xs">{item.suggestion.reason}</p>
                      {item.state === "open" ? (
                        <div className="-ml-3 flex gap-1">
                          <Button type="button" variant="ghost" size="sm" onClick={() => decideReview(index, true)}>
                            Accept
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => decideReview(index, false)}>
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <p className="type-meta text-xs">
                          {item.state === "accepted" ? "Applied." : item.state === "missing" ? "This text changed since the review." : "Left as is."}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Not a form: the editor already sits inside the post's form. */}
      <div className="flex h-9 items-center gap-2 rounded-full bg-black/5 pl-3 pr-1 dark:bg-white/10">
        <Sparkles aria-hidden className="size-4 shrink-0 text-[#A0A0A0]" />
        <input
          ref={inputRef}
          value={request}
          onChange={(event) => setRequest(event.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (request.trim() && !disabled) send(request.trim());
            } else if (event.key === "Escape") {
              setFocused(false);
              setResult(null);
              inputRef.current?.blur();
            }
          }}
          disabled={signedOut}
          maxLength={1000}
          placeholder={signedOut ? "Sign in to ask the agent" : "Ask the agent to write, rewrite or add something…"}
          aria-label="Ask the agent"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#A0A0A0]"
        />
        {selectionSize > 0 && (
          <span className="hidden shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] text-[#666666] sm:inline dark:bg-black dark:text-[#A0A0A0]">
            {selectionSize} selected
          </span>
        )}
        <button
          type="button"
          onClick={() => request.trim() && !disabled && send(request.trim())}
          aria-label="Send"
          disabled={disabled || !request.trim()}
          className="grid size-7 shrink-0 place-items-center rounded-full bg-black text-white cursor-pointer disabled:cursor-default disabled:opacity-30 dark:bg-white dark:text-black"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowUp className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" aria-label="Close" onClick={onClick} className="cursor-pointer text-[#A0A0A0] hover:text-black dark:hover:text-white">
      <X className="size-4" />
    </button>
  );
}

function EditResult({
  edit,
  request,
  state,
  onAccept,
  onReject,
  onClose,
}: {
  edit: AgentEdit;
  request: string;
  state: "open" | "accepted" | "rejected";
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
}) {
  const hasChange = edit.placement !== "none" && edit.blocks.length > 0;
  let preview: ReactNode = null;
  if (hasChange) {
    preview = (
      <div
        className="post-content max-h-72 overflow-y-auto rounded-xl bg-black/[0.03] px-4 py-3 text-sm font-light leading-relaxed dark:bg-white/[0.04] [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-(--alxpro-terminal-background) [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-[12px] [&_[data-type=terminal-block]]:my-2 [&_[data-type=terminal-block]]:rounded-lg [&_[data-type=terminal-block]]:bg-(--alxpro-terminal-background) [&_[data-type=terminal-block]]:p-3 [&_[data-type=terminal-block]]:font-mono [&_[data-type=terminal-block]]:text-[12px] [&_[data-type=terminal-block]]:whitespace-pre [&_[data-callout]]:rounded-md [&_[data-callout]]:bg-black/5 [&_[data-callout]]:px-3 [&_[data-callout]]:py-2 dark:[&_[data-callout]]:bg-white/10 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5"
        // Built from escaped text by blockToHtml.
        dangerouslySetInnerHTML={{ __html: edit.blocks.map(blockToHtml).join("") }}
      />
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="type-meta text-xs">“{request || "Your request"}”</p>
        <CloseButton onClick={onClose} />
      </div>
      <p className="text-sm">{edit.reply}</p>
      {preview}
      {hasChange && (
        <div className="flex items-center justify-between gap-3">
          <p className="type-meta text-xs">{PLACEMENT_LABEL[edit.placement]}</p>
          {state === "open" ? (
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={onReject}>
                Reject
              </Button>
              <Button type="button" size="sm" onClick={onAccept}>
                Accept
              </Button>
            </div>
          ) : (
            <p className="type-meta text-xs">{state === "accepted" ? "Added to the post." : "Left as is."}</p>
          )}
        </div>
      )}
    </div>
  );
}
