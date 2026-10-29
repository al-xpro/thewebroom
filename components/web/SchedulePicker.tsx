"use client";

import { useState, type ReactNode } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// `datetime-local` works in the browser's time zone, which is the author's.
export function toLocalInputValue(time: number) {
  const date = new Date(time);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export function formatPublishAt(time: number) {
  return new Date(time).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function timeZoneName() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

interface SchedulePickerProps {
  // The button that opens the picker.
  children: ReactNode;
  initial?: number;
  confirmLabel?: string;
  onConfirm: (publishAt: number) => Promise<void> | void;
}

// A date and time for a post to go out (#60).
export function SchedulePicker({ children, initial, confirmLabel = "Schedule", onConfirm }: SchedulePickerProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  // Read when the picker opens; the server checks the time again.
  const [now, setNow] = useState(() => Date.now());

  const publishAt = value ? new Date(value).getTime() : NaN;
  const valid = Number.isFinite(publishAt) && publishAt > now + 60_000;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          const opened = Date.now();
          setNow(opened);
          setValue(toLocalInputValue(initial ?? opened + 24 * 60 * 60 * 1000));
        }
      }}
    >
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <div className="space-y-1">
          <label htmlFor="publish-at" className="text-sm font-medium flex items-center gap-2">
            <CalendarClock className="size-4" /> Publish on
          </label>
          <Input
            id="publish-at"
            type="datetime-local"
            value={value}
            min={toLocalInputValue(now + 2 * 60_000)}
            onChange={(e) => setValue(e.target.value)}
          />
          <p className="text-xs text-paragraph">Your time zone: {timeZoneName()}</p>
          {value && !valid && <p className="text-xs text-destructive">Pick a time at least a minute from now.</p>}
        </div>
        <Button
          type="button"
          className="w-full"
          disabled={!valid || pending}
          onClick={async () => {
            setPending(true);
            try {
              await onConfirm(publishAt);
              setOpen(false);
            } finally {
              setPending(false);
            }
          }}
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {confirmLabel}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
