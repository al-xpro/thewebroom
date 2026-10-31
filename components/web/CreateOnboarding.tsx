"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, CalendarClock, PenLine, Sparkles, Type, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// A short tour of the editor on a first visit to /create; "Guide" in the header opens it
// again. Remembered per browser.

const STORAGE_KEY = "twr:create-onboarding";

type Step = { icon: LucideIcon; title: string; text: string; tips: string[]; link?: { href: string; label: string } };

const STEPS: Step[] = [
  {
    icon: PenLine,
    title: "Write",
    text: "A title, a subtitle, a cover image and the body. The line under the subtitle holds the author, the date, the topic and the reading time.",
    tips: ["Click the topic to change it", "Drafts save with nothing filled in", "5,000 characters to publish"],
  },
  {
    icon: Type,
    title: "Format",
    text: "The toolbar holds headings, lists, links, code and terminal blocks, and tables. On the left: where the toolbar sits, and the character count.",
    tips: ["Move the toolbar with the arrow", "Terminal blocks write npm once for every package manager"],
  },
  {
    icon: Sparkles,
    title: "Ask the agent",
    text: "Agent, next to the count, swaps the formatting tools for the agent. Ask in your own words, or pick a suggestion. You see every change before it's made.",
    tips: ["Proofread selection", "Rewrite selection", "Make it shorter", "New paragraph or heading", "Code, terminal block, table", "Comment", "Review the draft"],
  },
  {
    icon: CalendarClock,
    title: "Publish",
    text: "Draft keeps it private, Schedule picks a day and time, Publish puts it out now. Posts written with the agent say so.",
    tips: ["My posts lists drafts and scheduled posts"],
  },
  {
    icon: Bot,
    title: "Bring your own agent",
    text: "Connect Claude Code, Cursor or VS Code with MCP: your agent writes drafts from your code and notes, and they open here for you to finish.",
    tips: ["One token, one command", "Drafts only: you always publish"],
    link: { href: "/mcp", label: "Set up your agent" },
  },
];

const noSubscribe = () => () => {};

function hasSeenTour() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    // Storage blocked: no tour, nothing breaks.
    return true;
  }
}

// The tour opens on a first visit to the editor (after hydrating), and on request.
export function useCreateOnboarding() {
  const seen = useSyncExternalStore(noSubscribe, hasSeenTour, () => true);
  // What the member chose in this visit; until then, the stored answer.
  const [choice, setChoice] = useState<boolean | null>(null);
  const open = choice ?? !seen;
  const close = () => {
    setChoice(false);
    try {
      localStorage.setItem(STORAGE_KEY, "done");
    } catch {}
  };
  return { open, show: () => setChoice(true), close };
}

export function CreateOnboarding({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence onExitComplete={() => setStep(0)}>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="false"
          aria-labelledby="create-onboarding-title"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed bottom-24 right-4 z-[60] w-[min(24rem,calc(100vw-2rem))] rounded-3xl border border-black/5 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] sm:right-6 dark:border-white/10 dark:bg-black"
        >
          <div className="flex items-center justify-between pb-4">
            <div className="flex gap-1" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
              {STEPS.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  aria-label={s.title}
                  onClick={() => setStep(i)}
                  className={cn(
                    "h-1.5 rounded-full cursor-pointer transition-all",
                    i === step ? "w-6 bg-black dark:bg-white" : "w-1.5 bg-black/15 dark:bg-white/20"
                  )}
                />
              ))}
            </div>
            <button type="button" aria-label="Close the guide" onClick={onClose} className="cursor-pointer text-[#A0A0A0] hover:text-black dark:hover:text-white">
              <X className="size-4" />
            </button>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-black/5 dark:bg-white/10">
                  <current.icon className="size-4" />
                </span>
                <h2 id="create-onboarding-title" className="type-heading">
                  {current.title}
                </h2>
              </div>
              <p className="text-sm font-light leading-relaxed">{current.text}</p>
              <div className="flex flex-wrap gap-1.5">
                {current.tips.map((tip) => (
                  <span key={tip} className="rounded-full bg-black/5 px-2.5 py-1 text-xs text-[#666666] dark:bg-white/10 dark:text-[#A0A0A0]">
                    {tip}
                  </span>
                ))}
              </div>
              {current.link && (
                <Link href={current.link.href} onClick={onClose} className="inline-block text-sm underline underline-offset-4">
                  {current.link.label}
                </Link>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between pt-5">
            <Button type="button" variant="ghost" size="sm" onClick={step === 0 ? onClose : () => setStep(step - 1)}>
              {step === 0 ? "Skip" : "Back"}
            </Button>
            <Button type="button" size="sm" onClick={last ? onClose : () => setStep(step + 1)}>
              {last ? "Start writing" : "Next"}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
