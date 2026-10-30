"use client";

import { usePathname } from "next/navigation";
import { ArrowUpRight, Bot } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CopyBlock } from "@/components/web/CopyBlock";
import { agentViewFor } from "@/lib/agent-pages";
import { SITE_URL } from "@/lib/site-url";

// The footer's "For agents" button: what an agent can read on this page, with a link to
// copy into the agent, plus the site index and the MCP server. Hidden on personal pages.
export function ForAgentsButton() {
  const pathname = usePathname();
  const view = agentViewFor(pathname);
  if (!view) return null;
  const url = `${SITE_URL}${view.href}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-black/10 px-2.5 py-0.5 text-xs text-black hover:bg-black/5 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
        >
          <Bot aria-hidden className="size-3.5" />
          For agents
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        sideOffset={8}
        className="z-[1000] w-[min(24rem,calc(100vw-2rem))] space-y-3 rounded-2xl border border-black/5 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-black"
      >
        <div className="space-y-1">
          <p className="type-label">{view.label}</p>
          <p className="type-meta text-xs">{view.description}</p>
        </div>
        <CopyBlock code={url} className="py-2 text-xs" />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <a href={view.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:underline underline-offset-4">
            Open <ArrowUpRight className="size-3" />
          </a>
          {view.href !== "/llms.txt" && (
            <a href="/llms.txt" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:underline underline-offset-4">
              Site index <ArrowUpRight className="size-3" />
            </a>
          )}
          <a href="/mcp" className="inline-flex items-center gap-0.5 hover:underline underline-offset-4">
            Connect with MCP
          </a>
          <a href="/rules" className="inline-flex items-center gap-0.5 hover:underline underline-offset-4">
            Rules
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}
