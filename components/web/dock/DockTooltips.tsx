"use client";

import { useEffect, useRef, useState } from "react";
import { motion, type MotionValue } from "framer-motion";
import { cn } from "@/lib/utils";
import type { DockLabel, DockPosition } from "./types";

const ITEM_HEIGHT = 32;

interface TooltipProps {
  items: DockLabel[];
  hoveredIndex: number | null;
  prevHoveredIndex: number;
  position: DockPosition;
}

// Beside a vertical dock: the labels stack in a column that slides to the hovered one.
export function VerticalTooltip({ items, hoveredIndex, prevHoveredIndex, ySpring, position }: TooltipProps & { ySpring: MotionValue<number> }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      className={cn(
        "hidden sm:block pointer-events-none absolute overflow-hidden rounded-full bg-black text-white dark:bg-white dark:text-black z-50",
        position === "left" ? "left-full ml-3" : "right-full mr-3"
      )}
      style={{ top: ySpring, y: "-50%" }}
      animate={{ opacity: hoveredIndex !== null ? 1 : 0, height: ITEM_HEIGHT }}
      transition={{ opacity: { duration: 0.15 } }}
    >
      <motion.div
        className="flex flex-col items-center"
        initial={false}
        animate={{ y: -(hoveredIndex ?? prevHoveredIndex) * ITEM_HEIGHT }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
      >
        {items.map((item) => (
          <div
            key={item.key}
            className="inline-flex w-full h-8 items-center justify-center px-4 text-xs font-medium whitespace-nowrap"
            style={{ height: ITEM_HEIGHT }}
          >
            {item.label}
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// Above or below a horizontal dock: the labels sit in a row that slides to the hovered one,
// and the pill takes that label's width.
export function HorizontalTooltip({ items, hoveredIndex, prevHoveredIndex, xSpring, position }: TooltipProps & { xSpring: MotionValue<number> }) {
  const [textWidths, setTextWidths] = useState<number[]>([]);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);
  const itemsKey = items.map((item) => item.key).join("|");

  // Measures the labels once they've rendered (hidden), and again if one changes size.
  useEffect(() => {
    const count = itemsKey.split("|").length;
    const measured = textRefs.current.slice(0, count);
    const ro = new ResizeObserver(() => {
      const widths = measured.map((el) => el?.offsetWidth || 0);
      setTextWidths((prev) => (prev.length === widths.length && prev.every((w, i) => w === widths[i]) ? prev : widths));
    });
    measured.forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
  }, [itemsKey]);

  const activeIndex = hoveredIndex ?? prevHoveredIndex;
  const width = textWidths[activeIndex] || 0;
  const offset = -textWidths.slice(0, activeIndex).reduce((sum, w) => sum + w, 0);

  return (
    <>
      <div
        className="flex absolute opacity-0 pointer-events-none top-0 left-0 h-8 items-center whitespace-nowrap"
        aria-hidden="true"
      >
        {items.map((item, index) => (
          <div
            key={`measure-${item.key}`}
            ref={(el) => {
              textRefs.current[index] = el;
            }}
            className="px-4 text-xs font-medium"
          >
            {item.label}
          </div>
        ))}
      </div>
      {textWidths.length > 0 && (
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          className={cn(
            "hidden sm:block pointer-events-none absolute left-0 overflow-hidden rounded-full bg-black text-white dark:bg-white dark:text-black z-50",
            position === "bottom" ? "bottom-full mb-3" : "top-full mt-3"
          )}
          style={{ x: xSpring, translateX: "-50%" }}
          animate={{ opacity: hoveredIndex !== null ? 1 : 0, width }}
          transition={{ opacity: { duration: 0.15 }, width: { duration: 0.25, ease: "easeOut" } }}
        >
          <motion.div
            className="flex h-8 items-center whitespace-nowrap"
            animate={{ x: offset }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {items.map((item, index) => (
              <div
                key={`vis-${item.key}`}
                style={{ width: textWidths[index] }}
                className="flex h-8 items-center justify-center px-4 text-xs font-medium"
              >
                {item.label}
              </div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
