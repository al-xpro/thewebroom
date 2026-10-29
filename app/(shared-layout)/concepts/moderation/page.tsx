"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reports } from "../data";

const REASONS = ["Spam", "Harassment", "Plagiarism", "Off-topic", "Something else"];

// A reader reports in two taps; the agent sorts the queue; a person decides.
export default function ModerationConcept() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [decided, setDecided] = useState<Record<number, string>>({});

  return (
    <>
      <h1 className="type-display py-10">Moderation</h1>

      <section className="section-minimal">
        <h2 className="type-label">Reader</h2>
        <div className="flex items-start justify-between gap-4">
          <p className="type-body">“Buy cheap followers here → link.example”</p>
          <Button variant="ghost" size="sm" onClick={() => { setOpen(true); setSent(false); setReason(null); }}>
            <Flag className="size-4" /> Report
          </Button>
        </div>
        {open && (
          <div className="space-y-4 rounded-2xl border p-5">
            {sent ? (
              <p className="type-meta">Thanks. A person will look at it.</p>
            ) : (
              <>
                <p className="type-heading">What’s wrong?</p>
                <div className="flex flex-wrap gap-2">
                  {REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      aria-pressed={reason === r}
                      className={`rounded-full px-3 py-1.5 text-sm cursor-pointer ${
                        reason === r ? "bg-black text-white dark:bg-white dark:text-black" : "bg-black/5 dark:bg-white/10"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button size="sm" disabled={!reason} onClick={() => setSent(true)}>Send</Button>
                </div>
              </>
            )}
          </div>
        )}
      </section>

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
