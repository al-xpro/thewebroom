"use client";

import { useState } from "react";
import { FileCodeBlock, TerminalBlock } from "@/components/web/PostContent";
import type { GuideBlock, McpClient } from "@/lib/agent-docs";
import { cn } from "@/lib/utils";

// The same terminal and code blocks as in posts (alxpro-theme), with their copy buttons.
export function GuideBlockView({ block }: { block: GuideBlock }) {
  if (block.kind === "terminal") {
    return (
      <TerminalBlock
        data={{
          activeManager: "npm",
          npm: block.code,
          pnpm: block.code,
          yarn: block.code,
          bun: block.code,
          showHeader: true,
          label: block.label,
        }}
      />
    );
  }
  return (
    <FileCodeBlock
      data={{
        showHeader: true,
        filename: block.filename,
        fileIcon: block.lang,
        highlightedLines: [],
        code: block.code,
        ssrLight: null,
        ssrDark: null,
      }}
    />
  );
}

// `code` in a step's text shows as inline code (the Markdown guide keeps the backticks).
function StepText({ text }: { text: string }) {
  return (
    <p className="text-sm font-light leading-6">
      {text.split("`").map((part, i) =>
        i % 2 ? (
          <code key={i} className="rounded bg-black/5 px-1 font-mono text-[12px] dark:bg-white/10">
            {part}
          </code>
        ) : (
          part
        )
      )}
    </p>
  );
}

// Setup, one client at a time: numbered steps, each with its command or file, and how to
// check it worked.
export function McpClientGuide({ clients }: { clients: McpClient[] }) {
  const [active, setActive] = useState(clients[0].id);
  const client = clients.find((c) => c.id === active) ?? clients[0];

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Your agent" className="flex flex-wrap gap-1">
        {clients.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={c.id === active}
            onClick={() => setActive(c.id)}
            className={cn(
              "cursor-pointer rounded-full px-3 py-1 text-sm transition-colors",
              c.id === active
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-[#666666] hover:text-black dark:text-[#A0A0A0] dark:hover:text-white"
            )}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-label={client.name} className="space-y-6">
        <p className="type-meta">{client.intro}</p>
        <ol className="space-y-6">
          {client.steps.map((step, index) => (
            <li key={index} className="grid grid-cols-[1.75rem_1fr] gap-x-2 gap-y-3">
              <span className="grid size-6 place-items-center rounded-full bg-black/5 text-xs tabular-nums dark:bg-white/10">
                {index + 1}
              </span>
              <StepText text={step.text} />
              {step.block && (
                <div className="col-span-2 min-w-0 sm:col-start-2 sm:col-span-1">
                  <GuideBlockView block={step.block} />
                </div>
              )}
            </li>
          ))}
        </ol>
        <p className="flex gap-2 text-sm font-light">
          <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-[#3FA35B]" />
          {client.check}
        </p>
      </div>
    </div>
  );
}
