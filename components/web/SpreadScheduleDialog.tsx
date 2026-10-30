"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";
import { formatPublishAt, timeZoneName, toLocalInputValue } from "@/components/web/SchedulePicker";

const INTERVALS = {
  daily: { label: "One a day", ms: 24 * 60 * 60 * 1000 },
  weekly: { label: "One a week", ms: 7 * 24 * 60 * 60 * 1000 },
} as const;
type Interval = keyof typeof INTERVALS;

interface SpreadScheduleDialogProps {
  drafts: { _id: Id<"posts">; title: string }[];
  onClose: () => void;
  onScheduled: () => void;
}

// Spreads the picked drafts over a period, previewing each date before confirming (#60).
export function SpreadScheduleDialog({ drafts, onClose, onScheduled }: SpreadScheduleDialogProps) {
  const schedulePostSeries = useMutation(api.scheduledPosts.schedulePostSeries);
  const [start, setStart] = useState(() => toLocalInputValue(Date.now() + 24 * 60 * 60 * 1000));
  const [interval, setSpreadInterval] = useState<Interval>("weekly");
  const [pending, setPending] = useState(false);
  // Read when the dialog opens; the server checks the times again.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, pending]);

  const startAt = start ? new Date(start).getTime() : NaN;
  const valid = Number.isFinite(startAt) && startAt > now + 60_000;
  const dates = drafts.map((_, i) => startAt + i * INTERVALS[interval].ms);

  const confirm = async () => {
    setPending(true);
    try {
      await schedulePostSeries({ postIds: drafts.map((d) => d._id), startAt, interval });
      showSuccessToast(`${drafts.length} posts scheduled`);
      onScheduled();
    } catch (error) {
      showErrorToast((error as { data?: string }).data ?? "Failed to schedule the posts");
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="spread-title"
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="flex w-full max-w-md flex-col gap-5 rounded-2xl bg-white p-6 dark:bg-black border">
        <div className="space-y-1">
          <h2 id="spread-title" className="text-xl font-bold">Spread over a period</h2>
          <p className="text-sm text-paragraph">
            {drafts.length} draft{drafts.length !== 1 ? "s" : ""}, in the order you picked them.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium">
            First post
            <Input type="datetime-local" value={start} min={toLocalInputValue(now + 2 * 60_000)} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="space-y-1 text-sm font-medium">
            Then
            <select
              value={interval}
              onChange={(e) => setSpreadInterval(e.target.value as Interval)}
              className="h-9 w-full rounded-md border bg-white dark:bg-black px-3 text-sm"
            >
              {Object.entries(INTERVALS).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-xs text-paragraph -mt-2">Your time zone: {timeZoneName()}</p>

        {valid ? (
          <ol className="max-h-56 overflow-y-auto space-y-2 text-sm">
            {drafts.map((draft, i) => (
              <li key={draft._id} className="flex items-baseline justify-between gap-4">
                <span className="truncate">{draft.title}</span>
                <span className="shrink-0 text-paragraph">{formatPublishAt(dates[i])}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-destructive">Pick a start at least a minute from now.</p>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={confirm} disabled={!valid || pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Schedule {drafts.length}
          </Button>
        </div>
      </div>
    </div>
  );
}
