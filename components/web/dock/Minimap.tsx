"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { motion, useMotionValue } from "framer-motion";
import { GripHorizontal, GripVertical } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { MinimapLine } from "./MinimapLine";

const LINE_COUNT = 40;
const SCROLL_MS = 1200;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface MinimapProps {
  completion: number;
  headings: number[];
  isVertical: boolean;
  isDragging: boolean;
  // The pointer is over the track: the dock doesn't drag from there.
  onTrackPointerEnter: () => void;
  onTrackPointerLeave: () => void;
  // A click on the track scrolls the page there.
  onTrackScrollStart: () => void;
  onTrackScrollEnd: () => void;
}

// On posts, the dock becomes a map of the page: a tick per stretch, longer ones for
// headings, and a marker where you are. Click anywhere on it to go there.
export function Minimap({
  completion,
  headings,
  isVertical,
  isDragging,
  onTrackPointerEnter,
  onTrackPointerLeave,
  onTrackScrollStart,
  onTrackScrollEnd,
}: MinimapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState(0);
  const mousePos = useMotionValue(Infinity);
  // The reading position as a motion value, so the lines follow it without re-rendering.
  const completionMV = useMotionValue(completion);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerSize(isVertical ? el.scrollHeight : el.scrollWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [isVertical]);

  useEffect(() => {
    completionMV.set(completion);
  }, [completion, completionMV]);

  // One line per heading, at the line nearest its place on the page.
  const lines = useMemo(() => {
    const headingIndices = new Set(headings.map((h) => Math.min(Math.floor(h * (LINE_COUNT - 1)), LINE_COUNT - 1)));
    return Array.from({ length: LINE_COUNT }, (_, i) => ({ id: i, isHeading: headingIndices.has(i) }));
  }, [headings]);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mousePos.set(isVertical ? e.clientY - rect.top : e.clientX - rect.left);
  };

  const handleTrackClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = isVertical ? (e.clientY - rect.top) / rect.height : (e.clientX - rect.left) / rect.width;

    const startY = window.scrollY;
    const distance = percent * (document.documentElement.scrollHeight - window.innerHeight) - startY;
    let startTime: number | null = null;

    const step = (timestamp: number) => {
      startTime ??= timestamp;
      const progress = Math.min((timestamp - startTime) / SCROLL_MS, 1);
      window.scrollTo(0, startY + distance * easeInOutCubic(progress));
      if (progress < 1) requestAnimationFrame(step);
      else onTrackScrollEnd();
    };

    onTrackScrollStart();
    requestAnimationFrame(step);
  };

  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(5px)" }}
      animate={{ opacity: 1, transition: { delay: 0.15 }, filter: "blur(0px)" }}
      exit={{ opacity: 0, filter: "blur(5px)" }}
      transition={{ duration: 0 }}
      dragSnapToOrigin
      className={cn(
        "relative flex items-center justify-between p-1",
        isVertical ? "flex-col h-full w-full" : "flex-row w-full h-full"
      )}
    >
      <div
        ref={containerRef}
        data-minimap-track="true"
        className={cn(
          "relative flex items-center justify-between grow cursor-pointer",
          isVertical ? "flex-col w-full px-1" : "flex-row h-full py-1",
          isDragging && "select-none pointer-events-none"
        )}
        onMouseMove={isDragging ? undefined : handleMouseMove}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseLeave={() => mousePos.set(Infinity)}
        onPointerEnter={isDragging ? undefined : onTrackPointerEnter}
        onPointerLeave={isDragging ? undefined : onTrackPointerLeave}
        onClick={isDragging ? undefined : handleTrackClick}
      >
        {lines.map((line) => (
          <MinimapLine
            key={line.id}
            index={line.id}
            totalLines={LINE_COUNT}
            isHeading={line.isHeading}
            isVertical={isVertical}
            mousePos={mousePos}
            scrollPos={completionMV}
            containerSize={containerSize}
            floatIndex={completion * (LINE_COUNT - 1)}
          />
        ))}

        {/* Where you are */}
        <motion.div
          className="absolute bg-black dark:bg-white rounded-full pointer-events-none z-20"
          style={
            isVertical
              ? { top: `${completion * 100}%`, left: "56%", width: "35px", height: "2px", x: "-50%" }
              : { left: `${completion * 100}%`, top: "55%", height: "35px", width: "2px", y: "-50%" }
          }
          transition={{ type: "spring", bounce: 0, duration: 0.5 }}
        >
          <svg
            width="11"
            height="6"
            viewBox={isVertical ? "0 0 9 6" : "0 0 10 6"}
            xmlns="http://www.w3.org/2000/svg"
            className={isVertical ? "absolute -top-0.75 -left-3 -rotate-90" : "absolute -top-2 -left-0.75"}
          >
            <path d="M3.54688 6L0.515786 0.75L6.57796 0.75L3.54688 6Z" fill="currentColor"></path>
          </svg>
        </motion.div>
      </div>

      <Separator
        orientation={isVertical ? "horizontal" : "vertical"}
        className={cn("bg-border/60 shrink-0", isVertical ? "w-8 h-[1px] my-2" : "h-8 w-[1px] mx-2")}
      />

      <div
        className={cn(
          "flex items-center justify-center shrink-0 text-paragraph transition-colors select-none touch-none",
          isVertical ? "h-6 w-full" : "w-6 h-full"
        )}
      >
        {isVertical ? <GripHorizontal /> : <GripVertical />}
      </div>
    </motion.div>
  );
}
