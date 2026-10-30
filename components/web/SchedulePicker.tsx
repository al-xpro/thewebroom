"use client";

import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNowStrict } from "date-fns";
import { Calendar, TimeField } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
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

export function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function timeOf(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

// Days a writer picks most, relative to today.
function quickDays() {
  const today = startOfToday();
  const nextMonday = addDays(today, ((8 - today.getDay()) % 7) || 7);
  return [
    { label: "Tomorrow", day: addDays(today, 1) },
    { label: "In 3 days", day: addDays(today, 3) },
    { label: "Monday", day: nextMonday },
    { label: "In a week", day: addDays(today, 7) },
  ];
}

function sameDay(a: Date | undefined, b: Date) {
  return Boolean(a) && a!.toDateString() === b.toDateString();
}

// A day and a time, in the author's time zone, with a line saying when that is. Shared
// by the schedule picker and the schedule dialog.
export function DateTimeFields({
  day,
  onDay,
  time,
  onTime,
}: {
  day: Date | undefined;
  onDay: (day: Date | undefined) => void;
  time: string;
  onTime: (time: string) => void;
}) {
  const at = combineDayAndTime(day, time);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-1">
        {quickDays().map((quick) => (
          <button
            key={quick.label}
            type="button"
            aria-pressed={sameDay(day, quick.day)}
            onClick={() => onDay(quick.day)}
            className={cn(
              "rounded-full px-1 py-1 text-xs whitespace-nowrap cursor-pointer transition-colors",
              sameDay(day, quick.day)
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "bg-black/5 text-[#666666] hover:text-black dark:bg-white/10 dark:text-[#A0A0A0] dark:hover:text-white"
            )}
          >
            {quick.label}
          </button>
        ))}
      </div>

      <Calendar
        selected={day}
        onSelect={onDay}
        min={startOfToday()}
        max={new Date(new Date().getFullYear() + 1, 11, 31)}
      />

      <div className="relative divider-fade-top pt-5">
        <label htmlFor="publish-time" className="sr-only">Time</label>
        <TimeField id="publish-time" value={time} onChange={onTime} />
      </div>

      <p className="text-center text-xs font-light text-[#666666] dark:text-[#A0A0A0]">
        {Number.isFinite(at) ? (
          <>
            <span className="text-black dark:text-white">
              {new Date(at).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </span>
            {` · ${formatDistanceToNowStrict(at, { addSuffix: true })}`}
            <br />
          </>
        ) : (
          <>Pick a day<br /></>
        )}
        {timeZoneName()}
      </p>
    </div>
  );
}

// The time a day and an "HH:MM" time stand for, or NaN without a day.
export function combineDayAndTime(day: Date | undefined, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return day ? new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes).getTime() : NaN;
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

  const publishAt = combineDayAndTime(day, time);
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
      <DateTimeFields day={day} onDay={setDay} time={time} onTime={setTime} />
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
        <PopoverContent
          align="start"
          sideOffset={8}
          className="w-[20rem] rounded-3xl border border-black/5 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-black"
        >
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
        <div className="mx-auto w-full max-w-sm px-5 pb-8 pt-2">{panel}</div>
      </DrawerContent>
    </Drawer>
  );
}
