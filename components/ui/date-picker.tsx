"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// A calendar and a time field made for this site: black and white, one accent for today,
// no borders around days. Monday first. Days before `min` and after `max` can't be picked.

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleString("en-US", { month: "short" }));

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(a: Date | undefined, b: Date | undefined) {
  return Boolean(a && b) && a!.getFullYear() === b!.getFullYear() && a!.getMonth() === b!.getMonth() && a!.getDate() === b!.getDate();
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

// Six weeks from the Monday on or before the 1st, so the grid never changes height.
function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

interface CalendarProps {
  selected: Date | undefined;
  onSelect: (day: Date) => void;
  min?: Date;
  max?: Date;
  className?: string;
}

export function Calendar({ selected, onSelect, min, max, className }: CalendarProps) {
  const today = startOfDay(new Date());
  const initial = selected ?? min ?? today;
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() });
  const [mode, setMode] = useState<"days" | "months">("days");
  const [direction, setDirection] = useState(0);
  const [focused, setFocused] = useState<Date>(startOfDay(initial));
  const gridRef = useRef<HTMLDivElement>(null);

  const minDay = min ? startOfDay(min) : undefined;
  const maxDay = max ? startOfDay(max) : undefined;
  const disabled = (day: Date) => (minDay && day < minDay) || (maxDay && day > maxDay);
  const monthDisabled = (year: number, month: number) =>
    (minDay && new Date(year, month + 1, 0) < minDay) || (maxDay && new Date(year, month, 1) > maxDay);

  const days = useMemo(() => monthGrid(view.year, view.month), [view]);
  const title = new Date(view.year, view.month, 1).toLocaleString("en-US", { month: "long", year: "numeric" });

  const shiftMonth = (delta: number) => {
    const next = new Date(view.year, view.month + delta, 1);
    if (monthDisabled(next.getFullYear(), next.getMonth())) return;
    setDirection(delta);
    setView({ year: next.getFullYear(), month: next.getMonth() });
  };
  const canShift = (delta: number) => {
    const next = new Date(view.year, view.month + delta, 1);
    return !monthDisabled(next.getFullYear(), next.getMonth());
  };

  const moveFocus = (day: Date) => {
    if (disabled(day)) return;
    setFocused(day);
    if (day.getMonth() !== view.month || day.getFullYear() !== view.year) {
      setDirection(day > focused ? 1 : -1);
      setView({ year: day.getFullYear(), month: day.getMonth() });
    }
    requestAnimationFrame(() => gridRef.current?.querySelector<HTMLButtonElement>("[data-focused='true']")?.focus());
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (event.key in moves) {
      event.preventDefault();
      moveFocus(addDays(focused, moves[event.key]));
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      const d = new Date(focused.getFullYear(), focused.getMonth() + (event.key === "PageDown" ? 1 : -1), focused.getDate());
      moveFocus(d);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!disabled(focused)) onSelect(focused);
    }
  };

  return (
    <div className={cn("w-full select-none", className)}>
      <div className="flex items-center justify-between pb-3">
        <button
          type="button"
          onClick={() => setMode(mode === "days" ? "months" : "days")}
          aria-label={mode === "days" ? "Choose month and year" : "Back to days"}
          className="rounded-full px-2 py-1 -ml-2 text-sm font-medium cursor-pointer hover:bg-black/5 dark:hover:bg-white/10"
        >
          {mode === "days" ? title : view.year}
        </button>
        <div className="flex items-center">
          <button
            type="button"
            aria-label={mode === "days" ? "Previous month" : "Previous year"}
            disabled={mode === "days" ? !canShift(-1) : Boolean(minDay && view.year <= minDay.getFullYear())}
            onClick={() => (mode === "days" ? shiftMonth(-1) : setView({ ...view, year: view.year - 1 }))}
            className="grid size-8 place-items-center rounded-full cursor-pointer hover:bg-black/5 disabled:opacity-25 disabled:cursor-default disabled:hover:bg-transparent dark:hover:bg-white/10"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label={mode === "days" ? "Next month" : "Next year"}
            disabled={mode === "days" ? !canShift(1) : Boolean(maxDay && view.year >= maxDay.getFullYear())}
            onClick={() => (mode === "days" ? shiftMonth(1) : setView({ ...view, year: view.year + 1 }))}
            className="grid size-8 place-items-center rounded-full cursor-pointer hover:bg-black/5 disabled:opacity-25 disabled:cursor-default disabled:hover:bg-transparent dark:hover:bg-white/10"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {mode === "months" ? (
        <div className="grid grid-cols-3 gap-1.5 py-1">
          {MONTHS.map((label, month) => {
            const off = monthDisabled(view.year, month);
            const current = view.month === month;
            return (
              <button
                key={label}
                type="button"
                disabled={Boolean(off)}
                onClick={() => {
                  setView({ ...view, month });
                  setMode("days");
                }}
                className={cn(
                  "h-11 rounded-full text-sm cursor-pointer transition-colors disabled:cursor-default disabled:opacity-25",
                  current ? "bg-black text-white dark:bg-white dark:text-black" : "hover:bg-black/5 dark:hover:bg-white/10"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 pb-1">
            {WEEKDAYS.map((day) => (
              <span key={day} className="grid h-7 place-items-center text-[11px] font-medium uppercase tracking-wider text-[#A0A0A0] dark:text-[#666666]">
                {day}
              </span>
            ))}
          </div>
          <div className="relative overflow-hidden">
            <AnimatePresence initial={false} mode="popLayout" custom={direction}>
              <motion.div
                key={`${view.year}-${view.month}`}
                ref={gridRef}
                role="grid"
                aria-label={title}
                onKeyDown={onKeyDown}
                custom={direction}
                variants={{
                  enter: (d: number) => ({ x: d * 24, opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (d: number) => ({ x: d * -24, opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="grid grid-cols-7 gap-y-0.5"
              >
                {days.map((day) => {
                  const outside = day.getMonth() !== view.month;
                  const off = disabled(day);
                  const isSelected = sameDay(day, selected);
                  const isToday = sameDay(day, today);
                  const isFocused = sameDay(day, focused);
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      role="gridcell"
                      tabIndex={isFocused ? 0 : -1}
                      data-focused={isFocused}
                      aria-selected={isSelected}
                      aria-current={isToday ? "date" : undefined}
                      aria-label={day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                      disabled={Boolean(off)}
                      onClick={() => {
                        setFocused(day);
                        onSelect(day);
                      }}
                      className={cn(
                        "relative mx-auto grid size-9 place-items-center rounded-full text-sm tabular-nums transition-colors cursor-pointer outline-none",
                        "focus-visible:ring-2 focus-visible:ring-black/30 dark:focus-visible:ring-white/40",
                        isSelected
                          ? "bg-black font-medium text-white dark:bg-white dark:text-black"
                          : "hover:bg-black/5 dark:hover:bg-white/10",
                        !isSelected && outside && "text-[#A0A0A0] dark:text-[#555555]",
                        off && "cursor-default text-[#D4D4D4] hover:bg-transparent dark:text-[#3A3A3A] dark:hover:bg-transparent"
                      )}
                    >
                      {day.getDate()}
                      {isToday && !isSelected && (
                        <span aria-hidden className="absolute bottom-1 size-1 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}

// "HH:MM" in 24 hours, stepped by 15 minutes with − and +, typed directly, or picked from
// a few usual times.
const PRESETS = [
  { label: "Morning", value: "09:00" },
  { label: "Noon", value: "12:00" },
  { label: "3 PM", value: "15:00" },
  { label: "Evening", value: "18:00" },
];

function stepTime(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  const rounded = minutes > 0 ? Math.floor(total / 15) * 15 : Math.ceil(total / 15) * 15;
  const value = ((rounded % 1440) + 1440) % 1440;
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export function TimeField({ value, onChange, id }: { value: string; onChange: (value: string) => void; id?: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="15 minutes earlier"
          onClick={() => onChange(stepTime(value, -15))}
          className="grid size-9 place-items-center rounded-full cursor-pointer hover:bg-black/5 dark:hover:bg-white/10"
        >
          <Minus className="size-4" />
        </button>
        <input
          id={id}
          type="time"
          value={value}
          step={60}
          onChange={(event) => event.target.value && onChange(event.target.value)}
          className="w-32 bg-transparent text-center text-3xl font-light tabular-nums tracking-tight outline-none [&::-webkit-calendar-picker-indicator]:hidden"
        />
        <button
          type="button"
          aria-label="15 minutes later"
          onClick={() => onChange(stepTime(value, 15))}
          className="grid size-9 place-items-center rounded-full cursor-pointer hover:bg-black/5 dark:hover:bg-white/10"
        >
          <Plus className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            aria-pressed={value === preset.value}
            onClick={() => onChange(preset.value)}
            className={cn(
              "rounded-full px-1 py-1 text-xs whitespace-nowrap cursor-pointer transition-colors",
              value === preset.value
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "text-[#666666] hover:bg-black/5 dark:text-[#A0A0A0] dark:hover:bg-white/10"
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
