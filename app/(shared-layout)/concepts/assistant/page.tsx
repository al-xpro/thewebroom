"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { suggestions } from "../data";

const ACTIONS = ["Clarify", "Shorten", "Fix grammar", "Explain"];

// The writing assistant: a small menu on selected text, one ✦ button in the dock that opens
// a review before publishing, and a label on posts it helped with. Nothing changes on its own.
export default function AssistantConcept() {
  const [panel, setPanel] = useState(false);
  const [done, setDone] = useState<Record<number, "accepted" | "rejected">>({});

  return (
    <>
      <h1 className="type-display py-10">Assistant</h1>

      <section className="section-minimal">
        <h2 className="type-label">On selection</h2>
        <div className="relative pt-12">
          <div className="absolute left-16 top-0 flex gap-0.5 rounded-full border bg-white p-1 shadow-sm dark:bg-black">
            {ACTIONS.map((a) => (
              <button key={a} type="button" className="rounded-full px-2.5 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
                {a}
              </button>
            ))}
          </div>
          <p className="type-body text-lg">
            Request memoization is{" "}
            <mark className="bg-primary/15 text-black dark:text-white">basically kind of like a cache but not really</mark>
            , and that difference matters when you mutate data.
          </p>
        </div>
      </section>

      <section className="section-minimal">
        <div className="flex items-center justify-between">
          <h2 className="type-label">Before publishing</h2>
          <Button size="sm" variant={panel ? "outline" : "default"} onClick={() => setPanel((p) => !p)}>
            ✦ Review
          </Button>
        </div>
        {panel && (
          <ul>
            {suggestions.map((s, i) => (
              <li key={i} className="relative divider-fade-top space-y-2 py-4">
                <p className="type-label">{s.kind}</p>
                <p className="text-sm font-light text-[#A0A0A0] line-through dark:text-[#666666]">{s.before}</p>
                <p className="text-sm">{s.after}</p>
                <div className="flex gap-1 -ml-3">
                  {done[i] ? (
                    <p className="type-meta pl-3">{done[i] === "accepted" ? "Applied." : "Left as is."}</p>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setDone((d) => ({ ...d, [i]: "accepted" }))}>Accept</Button>
                      <Button variant="ghost" size="sm" onClick={() => setDone((d) => ({ ...d, [i]: "rejected" }))}>Reject</Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section-minimal">
        <h2 className="type-label">On the post</h2>
        <p className="type-meta inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-black dark:bg-white" /> Edited with the assistant
        </p>
        <p className="type-meta">5 reviews a day per member. Your text goes to the model only when you ask.</p>
      </section>
    </>
  );
}
