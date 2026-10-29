import Link from "next/link";
import { ArrowRight } from "lucide-react";

const concepts = [
  { href: "/concepts/follow", title: "Follow people", text: "A profile, a follow, a calmer feed." },
  { href: "/concepts/notifications", title: "Notifications", text: "Only what involves you." },
  { href: "/concepts/community", title: "Community", text: "Who writes here and what’s happening." },
  { href: "/concepts/mcp", title: "MCP server", text: "Draft from your own agent." },
  { href: "/concepts/moderation", title: "Report and moderation", text: "The agent sorts, a person decides." },
  { href: "/concepts/assistant", title: "Agentic toolbar", text: "Help on what you select, review before publishing." },
];

export default function ConceptsPage() {
  return (
    <>
      <h1 className="type-display py-10">Concepts</h1>
      <ul>
        {concepts.map((c) => (
          <li key={c.href}>
            <Link href={c.href} className="group relative divider-fade-top flex items-center justify-between gap-4 py-5">
              <div>
                <p className="type-heading">{c.title}</p>
                <p className="type-meta">{c.text}</p>
              </div>
              <ArrowRight className="size-4 text-[#A0A0A0] transition-transform group-hover:translate-x-1" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
