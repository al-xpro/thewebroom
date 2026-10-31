"use client";

import { forwardRef, useLayoutEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// How long the dock takes to resize when a group opens or closes; new items appear after.
export const GROUP_RESIZE_S = 0.25;

const DOCK_ITEM_TRANSITION = { type: "spring", stiffness: 420, damping: 36, mass: 0.8 } as const;

export const DockItem = forwardRef<
  HTMLDivElement,
  {
    children: ReactNode;
    index: number;
    onHover: (e: MouseEvent<HTMLElement>, index: number) => void;
  }
>(function DockItem({ children, index, onHover }, ref) {
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.85, filter: "blur(4px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      // Gone at once: fading out inside the resizing dock showed stretched icons.
      exit={{ opacity: 0, transition: { duration: 0 } }}
      transition={{ ...DOCK_ITEM_TRANSITION, delay: GROUP_RESIZE_S }}
      className="relative block"
      onMouseEnter={(e) => onHover(e, index)}
    >
      {children}
    </motion.div>
  );
});

export function DockIconWrapper({
  children,
  className,
  active = false,
  dot = false,
}: {
  children: ReactNode;
  className?: string;
  active?: boolean;
  dot?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative size-10 rounded-full flex items-center justify-center transition-colors duration-200 cursor-pointer",
        active
          ? "text-black dark:text-white"
          : "text-[#8F8F8F] hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10",
        className
      )}
    >
      {children}
      {active && <span aria-hidden className="absolute bottom-0.5 size-1 rounded-full bg-current" />}
      {dot && <span aria-label="New" className="absolute right-1.5 top-1.5 size-2 rounded-full border-2 border-white bg-primary dark:border-black" />}
    </div>
  );
}

// Runs `run` a few animation frames from now: after a new page has settled its scroll.
export function afterFrames(count: number, run: () => void) {
  const tick = () => (--count > 0 ? requestAnimationFrame(tick) : run());
  requestAnimationFrame(tick);
}

// Runs once, before paint, when it mounts.
export function OnMount({ onMount }: { onMount: () => void }) {
  const ref = useRef(onMount);
  useLayoutEffect(() => {
    ref.current();
  }, []);
  return null;
}
