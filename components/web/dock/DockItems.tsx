"use client";

import type { MouseEvent, PointerEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { GripHorizontal, GripVertical, Moon, Sun } from "lucide-react";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggle";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { DockIconWrapper, DockItem, GROUP_RESIZE_S, OnMount, afterFrames } from "./DockItem";
import type { DockEntry, DockGroup } from "./types";

interface DockItemsProps {
  entries: DockEntry[];
  group: DockGroup | null;
  isActive: (entry: DockEntry) => boolean;
  isVertical: boolean;
  isDragging: boolean;
  avatarUrl?: string | null;
  onHover: (e: MouseEvent<HTMLElement>, index: number) => void;
  onOpenGroup: (group: DockGroup) => void;
  // The items are here: the frame can take the dock's size.
  onReady: () => void;
  onGripDown: (e: PointerEvent<HTMLDivElement>) => void;
}

// The dock's items, then the theme toggle (outside groups) and the grip that drags it.
// One container for every group: the old items pop out and the new ones fade in while the
// dock resizes, so switching groups never blinks or jumps.
export function DockItems({
  entries,
  group,
  isActive,
  isVertical,
  isDragging,
  avatarUrl,
  onHover,
  onOpenGroup,
  onReady,
  onGripDown,
}: DockItemsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: isVertical ? 0 : 20, x: isVertical ? 20 : 0 }}
      animate={{ opacity: 1, y: 0, x: 0, transition: { delay: 0.15 } }}
      exit={{
        opacity: 0,
        y: isVertical ? 0 : 20,
        x: isVertical ? 20 : 0,
        transitionEnd: { display: "none" },
      }}
      transition={{ duration: 0.1, ease: "easeOut" }}
      className={cn(
        "relative flex items-center justify-center w-full h-full",
        isVertical ? "flex-col" : "flex-row",
        isDragging && "pointer-events-none"
      )}
    >
      {/* The frame takes the dock's size only once its items are here (measured empty,
          it stretched), and once a new page has settled its scroll. */}
      <OnMount onMount={() => afterFrames(3, onReady)} />
      <AnimatePresence mode="popLayout" initial={false}>
        {entries.map((entry, index) => {
          const active = isActive(entry);
          const icon =
            entry.avatar && avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="size-6 rounded-full object-cover" />
            ) : (
              <entry.icon className="size-5" />
            );
          const label = typeof entry.label === "string" ? entry.label : entry.key;
          return (
            <DockItem key={entry.key} index={index} onHover={onHover}>
              {entry.href ? (
                <Link href={entry.href} aria-label={label} aria-current={active ? "page" : undefined}>
                  <DockIconWrapper active={active} dot={entry.dot}>{icon}</DockIconWrapper>
                </Link>
              ) : (
                <button
                  type="button"
                  aria-label={label}
                  aria-expanded={entry.group ? false : undefined}
                  onClick={() => (entry.group ? onOpenGroup(entry.group) : entry.onClick?.())}
                >
                  <DockIconWrapper active={active} dot={entry.dot}>{icon}</DockIconWrapper>
                </button>
              )}
            </DockItem>
          );
        })}

        {!group && (
          <DockItem key="theme" index={entries.length} onHover={onHover}>
            <AnimatedThemeToggler className="w-full h-full block" aria-label="theme">
              <DockIconWrapper>
                <div className="relative w-full h-full flex items-center justify-center">
                  <Sun className="size-5 absolute scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                  <Moon className="size-5 absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                </div>
              </DockIconWrapper>
            </AnimatedThemeToggler>
          </DockItem>
        )}
      </AnimatePresence>

      {/* Keyed by group so it fades in at its new place; nothing in the dock keeps a
          layout node, so dragging it to another side keeps its own motion. */}
      <motion.div
        key={`grip-${group ?? "root"}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15, delay: GROUP_RESIZE_S }}
        className={cn("flex items-center", isVertical ? "flex-col" : "flex-row")}
      >
        <Separator
          orientation={isVertical ? "horizontal" : "vertical"}
          className={cn("bg-border/60 relative", isVertical ? "w-8 h-[1px] top-1" : "h-8 w-[1px] left-1")}
        />

        <div
          onPointerDown={onGripDown}
          role="button"
          aria-label="drag"
          className={cn(
            "relative flex w-full h-full items-center justify-center cursor-grab active:cursor-grabbing",
            isVertical ? "py-3 top-1" : "px-3 left-1"
          )}
        >
          {isVertical ? <GripHorizontal className="text-paragraph" /> : <GripVertical className="text-paragraph" />}
        </div>
      </motion.div>
    </motion.div>
  );
}
