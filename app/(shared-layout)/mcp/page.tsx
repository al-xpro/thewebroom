import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageShell } from "@/components/web/PageShell";
import {
  MCP_CLIENTS,
  MCP_EXAMPLE,
  MCP_EXAMPLES,
  MCP_FORMATTING,
  MCP_IN_EDITOR,
  MCP_LIMITS,
  MCP_TOOLS,
  MCP_TROUBLESHOOTING,
  MCP_URL,
  RULES,
} from "@/lib/agent-docs";
import { AgentTokens } from "./AgentTokens";
import { GuideBlockView, McpClientGuide } from "./McpClientGuide";

export const metadata: Metadata = {
  title: "Agents — The Web Room",
  description: "Connect your own agent to The Web Room with MCP: it writes drafts, you publish them.",
};

const agentRules = RULES.find((section) => section.id === "agents")!;

const FLOW = [
  { title: "Token", text: "Create one below. It's shown once." },
  { title: "Connect", text: "Add the server to your agent." },
  { title: "Ask", text: "Your agent writes a draft." },
  { title: "Publish", text: "You review it in the editor." },
];

// How to connect an agent over MCP, step by step for each client, with examples, and the
// member's tokens. Agents read the same guide at /agents/mcp and through get_rules.
export default function McpPage() {
  return (
    <PageShell>
      <div className="space-y-2 py-10">
        <h1 className="type-display">Agents</h1>
        <p className="type-body">
          Connect your own agent with MCP. It writes drafts for your account from your code, notes and
          ideas; you read them and publish.
        </p>
      </div>

      <ol className="grid grid-cols-2 gap-x-6 gap-y-5 pb-10 sm:grid-cols-4">
        {FLOW.map((item, index) => (
          <li key={item.title} className="space-y-1">
            <p className="font-mono text-xs text-[#A0A0A0] dark:text-[#666666]">{String(index + 1).padStart(2, "0")}</p>
            <p className="text-sm font-medium">{item.title}</p>
            <p className="type-meta text-xs">{item.text}</p>
          </li>
        ))}
      </ol>

      <section id="token" className="section-minimal scroll-mt-24">
        <h2 className="type-label">1 · Token</h2>
        <p className="type-meta">
          A token lets an agent act for your account. It needs a verified e-mail, is shown once, and you can
          create one a day. Keep it like a password: one per agent, revoked when you stop using it.
        </p>
        <AgentTokens />
      </section>

      <section id="connect" className="section-minimal scroll-mt-24">
        <div className="space-y-1">
          <h2 className="type-label">2 · Connect</h2>
          <p className="type-meta">
            The server is <code className="font-mono text-[13px] text-black dark:text-white">{MCP_URL}</code>{" "}
            (Streamable HTTP). Replace <code className="font-mono text-[13px]">twr_your_token</code> with yours.
          </p>
        </div>
        <McpClientGuide clients={MCP_CLIENTS} />
      </section>

      <section id="examples" className="section-minimal scroll-mt-24">
        <div className="space-y-1">
          <h2 className="type-label">3 · Ask</h2>
          <p className="type-meta">
            Talk to your agent as usual and mention The Web Room. Some things to try, and the tools it uses:
          </p>
        </div>
        <ul>
          {MCP_EXAMPLES.map((example) => (
            <li key={example.prompt} className="relative divider-fade-top space-y-2 py-5">
              <p className="text-[15px] leading-relaxed">“{example.prompt}”</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {example.tools.map((tool, index) => (
                  <span key={tool} className="inline-flex items-center gap-1.5">
                    {index > 0 && <ArrowRight aria-hidden className="size-3 text-[#A0A0A0]" />}
                    <code className="rounded-full bg-black/5 px-2 py-0.5 font-mono text-[11px] dark:bg-white/10">{tool}</code>
                  </span>
                ))}
              </div>
              <p className="type-meta text-xs">{example.result}</p>
            </li>
          ))}
        </ul>
        <div className="space-y-2">
          <p className="type-meta text-xs">What a call looks like:</p>
          <GuideBlockView block={{ kind: "file", filename: "create_draft", lang: "ts", code: MCP_EXAMPLE }} />
        </div>
      </section>

      <section id="editor" className="section-minimal scroll-mt-24">
        <h2 className="type-label">4 · In the editor</h2>
        <ol className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          {MCP_IN_EDITOR.map((item, index) => (
            <li key={item.title} className="grid grid-cols-[1.75rem_1fr] gap-x-2">
              <span className="grid size-6 place-items-center rounded-full bg-black/5 text-xs tabular-nums dark:bg-white/10">
                {index + 1}
              </span>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="type-meta text-xs">{item.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2">
          <Link href="/my-posts" className={buttonVariants({ size: "sm" })}>
            My posts
          </Link>
          <Link href="/create" className={buttonVariants({ size: "sm", variant: "ghost" })}>
            Open the editor
          </Link>
        </div>
      </section>

      <section className="section-minimal">
        <h2 className="type-label">Tools</h2>
        <ul className="space-y-3">
          {MCP_TOOLS.map((tool) => (
            <li key={tool.name} className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-4">
              <code className="font-mono text-sm">{tool.name}</code>
              <span className="type-meta">{tool.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section-minimal">
        <h2 className="type-label">Limits</h2>
        <dl className="space-y-2.5">
          {MCP_LIMITS.map((limit) => (
            <div key={limit.label} className="grid grid-cols-[7.5rem_1fr] gap-4">
              <dt className="text-sm">{limit.label}</dt>
              <dd className="type-meta">{limit.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="section-minimal">
        <h2 className="type-label">Formatting</h2>
        <p className="type-meta">The body is Markdown, without the title.</p>
        <dl className="space-y-2.5">
          {MCP_FORMATTING.map((item) => (
            <div key={item.name} className="grid grid-cols-[7.5rem_1fr] gap-4">
              <dt className="text-sm">{item.name}</dt>
              <dd className="type-meta">{item.detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="section-minimal">
        <h2 className="type-label">If something&apos;s wrong</h2>
        <dl className="space-y-3">
          {MCP_TROUBLESHOOTING.map((item) => (
            <div key={item.problem} className="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-4">
              <dt className="font-mono text-sm">{item.problem}</dt>
              <dd className="type-meta">{item.fix}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="section-minimal">
        <h2 className="type-label">What agents may do</h2>
        <ul className="space-y-2">
          {agentRules.rules.map((rule) => (
            <li key={rule} className="flex gap-3 text-sm font-light">
              <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-black dark:bg-white" />
              {rule}
            </li>
          ))}
        </ul>
        <p className="type-meta">
          Agents follow every{" "}
          <Link href="/rules" className="underline underline-offset-4 text-black dark:text-white">
            rule
          </Link>{" "}
          a member does.
        </p>
      </section>
    </PageShell>
  );
}
