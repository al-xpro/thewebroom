"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";
import { DateTimeFields, combineDayAndTime, formatPublishAt } from "@/components/web/SchedulePicker";

const INTERVALS = {
  daily: { label: "a day", ms: 24 * 60 * 60 * 1000 },
  weekly: { label: "a week", ms: 7 * 24 * 60 * 60 * 1000 },
} as const;
type Interval = keyof typeof INTERVALS;

interface ScheduleDialogProps {
  posts: { _id: Id<"posts">; title: string; publishAt?: number }[];
  onClose: () => void;
  onScheduled: () => void;
}

// The one way to schedule from My posts (#60): one post gets a day and a time; several get
// a first day and time plus one every day or week, in the order they were picked.
export function ScheduleDialog({ posts, onClose, onScheduled }: ScheduleDialogProps) {
  const schedulePost = useMutation(api.scheduledPosts.schedulePost);
  const schedulePostSeries = useMutation(api.scheduledPosts.schedulePostSeries);
  const first = posts[0]?.publishAt;
  const [day, setDay] = useState<Date | undefined>(() => new Date(first ?? Date.now() + 24 * 60 * 60 * 1000));
  const [time, setTime] = useState(() => {
    const d = new Date(first ?? 0);
    return first ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : "09:00";
  });
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

  const startAt = combineDayAndTime(day, time);
  const valid = Number.isFinite(startAt) && startAt > now + 60_000;
  const many = posts.length > 1;
  const dates = posts.map((_, i) => startAt + i * INTERVALS[interval].ms);

  const confirm = async () => {
    setPending(true);
    try {
      if (many) {
        await schedulePostSeries({ postIds: posts.map((p) => p._id), startAt, interval });
        showSuccessToast(`${posts.length} posts scheduled`);
      } else {
        await schedulePost({ postId: posts[0]._id, publishAt: startAt });
        showSuccessToast(`Scheduled for ${formatPublishAt(startAt)}`);
      }
      onScheduled();
    } catch (error) {
      showErrorToast((error as { data?: string }).data ?? "Failed to schedule");
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-title"
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="flex max-h-[90svh] w-full max-w-sm flex-col gap-5 overflow-y-auto rounded-3xl border border-black/5 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-black">
        <h2 id="schedule-title" className="type-heading">
          {many ? `Schedule ${posts.length} posts` : "Schedule"}
        </h2>

        <DateTimeFields day={day} onDay={setDay} time={time} onTime={setTime} />

        {many && (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="type-meta">Then one</span>
              <div className="flex gap-1">
                {(Object.keys(INTERVALS) as Interval[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSpreadInterval(key)}
                    aria-pressed={interval === key}
                    className={`rounded-full px-3 py-1 text-sm cursor-pointer ${
                      interval === key ? "bg-black text-white dark:bg-white dark:text-black" : "text-[#666666] dark:text-[#A0A0A0]"
                    }`}
                  >
                    {INTERVALS[key].label}
                  </button>
                ))}
              </div>
            </div>
            {valid && (
              <ol className="space-y-1.5">
                {posts.map((post, i) => (
                  <li key={post._id} className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="truncate">{post.title}</span>
                    <span className="type-meta shrink-0 text-xs">{formatPublishAt(dates[i])}</span>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}

        {day && !valid && <p className="text-xs text-destructive">At least a minute from now.</p>}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={!valid || pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Schedule
          </Button>
        </div>
      </div>
    </div>
  );
}
