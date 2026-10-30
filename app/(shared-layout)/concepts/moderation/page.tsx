"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { reports } from "../data";

// The admin's queue, sorted by an agent: it labels each report and says why; a person decides.
export default function ModerationConcept() {
  const [decided, setDecided] = useState<Record<number, string>>({});

  return (
    <>
      <div className="space-y-2 py-10">
        <h1 className="type-display">Agent moderation</h1>
        <p className="type-body">Admin only. Members already flag posts and comments; the agent sorts what comes in.</p>
      </div>

      <section className="section-minimal">
        <div className="flex items-baseline justify-between">
          <h2 className="type-label">Queue</h2>
          <p className="type-meta text-xs">Sorted by the agent · decided by you</p>
        </div>
        <ul>
          {reports.map((r, i) => (
            <li key={i} className="relative divider-fade-top space-y-2 py-5">
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-sm font-medium">{r.target}</p>
                <span className="type-meta text-xs">{r.reports} reports</span>
              </div>
              <p className="type-body text-sm">“{r.excerpt}”</p>
              <p className="type-meta text-xs">
                ✦ Likely <span className="text-black dark:text-white">{r.triage.label}</span> ({Math.round(r.triage.confidence * 100)}%). {r.triage.reason}
              </p>
              <div className="flex gap-1 -ml-3">
                {decided[i] ? (
                  <p className="type-meta pl-3">{decided[i]}</p>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setDecided((d) => ({ ...d, [i]: "Kept." }))}>Keep</Button>
                    <Button variant="ghost" size="sm" onClick={() => setDecided((d) => ({ ...d, [i]: "Hidden. The author was told why." }))}>Hide</Button>
                    <Button variant="destructive" size="sm" onClick={() => setDecided((d) => ({ ...d, [i]: "Removed; author banned." }))}>Ban</Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="type-meta">The agent never hides anything on its own. Content goes to a model only once the privacy policy says so (#20).</p>
      </section>
    </>
  );
}
