"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { mcpExample, mcpFormatting, mcpLimits, mcpNever, mcpTokens, mcpTools } from "../data";

const COMMAND = "claude mcp add thewebroom https://thewebroom.alxpro.com/mcp --header \"Authorization: Bearer twr_…\"";

// Settings → Agents: connect your own agent (Claude Code, Cursor) to draft posts. Drafts
// only; publishing always happens here.
export default function McpConcept() {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <div className="space-y-2 py-10">
        <h1 className="type-display">Agents</h1>
        <p className="type-body">Your agent writes drafts. You publish them.</p>
      </div>

      <section className="section-minimal">
        <h2 className="type-label">Connect</h2>
        <div className="flex items-center gap-2 rounded-lg border bg-(--alxpro-terminal-background) px-4 py-3 font-mono text-[13px]">
          <span className="text-(--alxpro-terminal-prompt) select-none">$</span>
          <code className="flex-1 truncate">{COMMAND}</code>
          <button
            type="button"
            aria-label="Copy"
            onClick={() => {
              void navigator.clipboard.writeText(COMMAND);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
            className="text-(--alxpro-terminal-muted) cursor-pointer"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </button>
        </div>
        <p className="type-meta">Then ask: “Write a draft about the feature I just shipped.”</p>
      </section>

      <section className="section-minimal">
        <h2 className="type-label">Tools it gets</h2>
        <ul className="space-y-3">
          {mcpTools.map((t) => (
            <li key={t.name} className="flex items-baseline gap-4">
              <code className="w-36 shrink-0 font-mono text-sm">{t.name}</code>
              <span className="type-meta">{t.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section-minimal">
        <h2 className="type-label">Limits</h2>
        <dl className="space-y-2.5">
          {mcpLimits.map((l) => (
            <div key={l.label} className="grid grid-cols-[7rem_1fr] gap-4">
              <dt className="text-sm">{l.label}</dt>
              <dd className="type-meta">{l.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="section-minimal">
        <h2 className="type-label">What a post looks like</h2>
        <p className="type-meta">Markdown with a short header. One idea per post, written for a person reading it.</p>
        <pre className="overflow-x-auto rounded-lg border bg-(--alxpro-terminal-background) p-4 font-mono text-[13px] leading-[20px]">
          {mcpExample}
        </pre>
        <ul className="grid gap-2 sm:grid-cols-2">
          <li className="type-meta"><span className="text-black dark:text-white">Do</span> explain what you built and why, with the real code.</li>
          <li className="type-meta"><span className="text-black dark:text-white">Don’t</span> list ten generic tips with no example.</li>
          <li className="type-meta"><span className="text-black dark:text-white">Do</span> keep code blocks short and runnable.</li>
          <li className="type-meta"><span className="text-black dark:text-white">Don’t</span> paste a whole file when ten lines show the point.</li>
        </ul>
      </section>

      <section className="section-minimal">
        <h2 className="type-label">Formatting</h2>
        <dl className="space-y-2.5">
          {mcpFormatting.map((f) => (
            <div key={f.name} className="grid grid-cols-[9rem_1fr] gap-4">
              <dt className="text-sm">{f.name}</dt>
              <dd className="type-meta">{f.detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="section-minimal">
        <h2 className="type-label text-destructive">Never</h2>
        <ul className="space-y-2">
          {mcpNever.map((n) => (
            <li key={n} className="flex gap-3 text-sm font-light">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-destructive" />
              {n}
            </li>
          ))}
        </ul>
        <p className="type-meta">Breaking these revokes the token; serious cases close the account. Every draft from an agent is labelled AI-assisted.</p>
      </section>

      <section className="section-minimal">
        <div className="flex items-center justify-between">
          <h2 className="type-label">Tokens</h2>
          <Button size="sm" variant="outline">New token</Button>
        </div>
        <ul>
          {mcpTokens.map((t) => (
            <li key={t.name} className="relative divider-fade-top flex items-center gap-4 py-3">
              <div className="flex-1">
                <p className="text-sm font-medium">{t.name}</p>
                <p className="type-meta text-xs">Created {t.created} · used {t.lastUsed}</p>
              </div>
              <StatusBadge status="active" />
              <Button size="sm" variant="destructive">Revoke</Button>
            </li>
          ))}
        </ul>
        <p className="type-meta">Tokens are stored hashed and shown once. 20 drafts a day per token.</p>
      </section>
    </>
  );
}
