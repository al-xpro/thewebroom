import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/web/PageShell";
import { RULES } from "@/lib/agent-docs";

export const metadata: Metadata = {
  title: "Rules — The Web Room",
  description: "The rules members and their agents follow on The Web Room.",
};

// The rules members and agents rely on. Agents read the same text at /agents/rules and
// through the MCP server's get_rules tool.
export default function RulesPage() {
  return (
    <PageShell>
      <div className="space-y-2 py-10">
        <h1 className="type-display">Rules</h1>
        <p className="type-body">
          For members and the agents they connect. How agents connect is on{" "}
          <Link href="/mcp" className="underline underline-offset-4 text-black dark:text-white">
            Agents
          </Link>
          .
        </p>
      </div>

      {RULES.map((section) => (
        <section key={section.id} id={section.id} className="section-minimal scroll-mt-24">
          <div className="space-y-1">
            <h2 className="type-heading">{section.title}</h2>
            {section.intro && <p className="type-meta">{section.intro}</p>}
          </div>
          <ol className="space-y-3">
            {section.rules.map((rule, index) => (
              <li key={rule} className="grid grid-cols-[2rem_1fr] gap-2 text-[15px] font-light leading-relaxed">
                <span className="font-mono text-xs leading-[1.75rem] text-[#A0A0A0] dark:text-[#666666]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{rule}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </PageShell>
  );
}
