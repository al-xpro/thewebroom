"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

// A command or config to copy, in the terminal style.
export function CopyBlock({ code, prompt = false, className }: { code: string; prompt?: boolean; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      className={cn(
        "relative flex items-start gap-2 rounded-lg border bg-(--alxpro-terminal-background) px-4 py-3 font-mono text-[13px] leading-[20px]",
        className
      )}
    >
      {prompt && <span className="text-(--alxpro-terminal-prompt) select-none">$</span>}
      <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        aria-label={copied ? "Copied" : "Copy"}
        onClick={() => {
          void navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="shrink-0 pt-0.5 text-(--alxpro-terminal-muted) cursor-pointer hover:text-(--alxpro-terminal-foreground)"
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}
