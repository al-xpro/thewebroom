"use client";

import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";

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

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function timeOf(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

interface SchedulePickerProps {
  // What opens the picker.
  children: ReactNode;
  initial?: number;
  confirmLabel?: string;
  onConfirm: (publishAt: number) => Promise<void> | void;
  // Shown when set: goes back to publishing right away.
  onClear?: () => void;
}

// A day and a time for a post to go out (#60): a panel on medium and large screens, a
// drawer on phones. Times are in the author's time zone.
export function SchedulePicker({ children, initial, confirmLabel = "Set", onConfirm, onClear }: SchedulePickerProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState<Date | undefined>();
  const [time, setTime] = useState("09:00");
  const [pending, setPending] = useState(false);
  // Read when the picker opens; the server checks the time again.
  const [now, setNow] = useState(() => Date.now());

  const [hours, minutes] = time.split(":").map(Number);
  const publishAt = day
    ? new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes).getTime()
    : NaN;
  const valid = Number.isFinite(publishAt) && publishAt > now + 60_000;

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) return;
    const opened = Date.now();
    setNow(opened);
    const start = new Date(initial ?? opened + 24 * 60 * 60 * 1000);
    setDay(start);
    setTime(initial ? timeOf(start) : "09:00");
  };

  const confirm = async () => {
    setPending(true);
    try {
      await onConfirm(publishAt);
      setOpen(false);
    } finally {
      setPending(false);
    }
  };

  const panel = (
    <div className="space-y-4">
      <Calendar
        mode="single"
        selected={day}
        onSelect={setDay}
        captionLayout="dropdown"
        startMonth={startOfToday()}
        endMonth={new Date(new Date().getFullYear() + 1, 11)}
        disabled={{ before: startOfToday() }}
        className="mx-auto p-0"
      />
      <div className="flex items-center justify-between gap-3 border-b border-black/10 dark:border-white/15 pb-2">
        <label htmlFor="publish-time" className="type-meta">Time</label>
        <input
          id="publish-time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="bg-transparent text-sm outline-none tabular-nums"
        />
      </div>
      <p className="type-meta text-xs">{timeZoneName()}</p>
      {day && !valid && <p className="text-xs text-destructive">At least a minute from now.</p>}
      <div className="flex gap-2">
        {onClear && (
          <Button
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={() => {
              onClear();
              setOpen(false);
            }}
          >
            Now
          </Button>
        )}
        <Button type="button" className="flex-1" disabled={!valid || pending} onClick={confirm}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {confirmLabel}
        </Button>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent align="start" className="w-auto rounded-2xl p-4">
          {panel}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="sr-only">
          <DrawerTitle>Publish date</DrawerTitle>
        </DrawerHeader>
        <div className="mx-auto w-full max-w-sm px-4 pb-8 pt-2">{panel}</div>
      </DrawerContent>
    </Drawer>
  );
}
