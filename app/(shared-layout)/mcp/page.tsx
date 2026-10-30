import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/web/PageShell";
import { CopyBlock } from "@/components/web/CopyBlock";
import { MCP_CLIENTS, MCP_EXAMPLE, MCP_FORMATTING, MCP_LIMITS, MCP_TOOLS, MCP_URL, RULES } from "@/lib/agent-docs";
import { AgentTokens } from "./AgentTokens";

export const metadata: Metadata = {
  title: "Agents — The Web Room",
  description: "Connect your own agent to The Web Room with MCP: it writes drafts, you publish them.",
};

const agentRules = RULES.find((section) => section.id === "agents")!;

// How to connect an agent over MCP, and the member's tokens. Agents read the same guide
// at /agents/mcp and through get_rules.
export default function McpPage() {
  return (
    <PageShell>
      <div className="space-y-2 py-10">
        <h1 className="type-display">Agents</h1>
        <p className="type-body">
          Connect your own agent with MCP. It writes drafts for your account; you read them and publish.
        </p>
      </div>

      <section className="section-minimal">
        <h2 className="type-label">1 · Token</h2>
        <p className="type-meta">
          A token lets an agent act for your account. It needs an account with a verified e-mail and is shown once.
        </p>
        <AgentTokens />
      </section>

      <section className="section-minimal">
        <h2 className="type-label">2 · Connect</h2>
        <p className="type-meta">
          Endpoint <code className="font-mono text-[13px] text-black dark:text-white">{MCP_URL}</code>, Streamable HTTP.
          Replace <code className="font-mono text-[13px]">&lt;token&gt;</code> with yours.
        </p>
        {MCP_CLIENTS.map((client) => (
          <div key={client.name} className="space-y-2">
            <p className="text-sm">{client.name}</p>
            <CopyBlock code={client.code} prompt={client.language === "bash"} />
          </div>
        ))}
      </section>

      <section className="section-minimal">
        <h2 className="type-label">3 · Ask</h2>
        <p className="type-meta">
          “Read the rules on The Web Room, then write a draft about the cache bug we fixed today.” The draft
          appears in{" "}
          <Link href="/my-posts" className="underline underline-offset-4 text-black dark:text-white">
            My posts
          </Link>
          ; add a cover image and publish it from the editor.
        </p>
        <CopyBlock code={MCP_EXAMPLE} />
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
