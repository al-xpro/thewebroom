"use client";

import { motion, useSpring, useTransform, type MotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

interface MinimapLineProps {
  index: number;
  totalLines: number;
  isHeading: boolean;
  isVertical: boolean;
  mousePos: MotionValue<number>;
  scrollPos: MotionValue<number>;
  containerSize: number;
  floatIndex: number;
}

// One tick of the minimap: it grows when the pointer or the reading position comes near,
// so a wave follows both. Headings are longer and darker.
export function MinimapLine({
  index,
  totalLines,
  isHeading,
  isVertical,
  mousePos,
  scrollPos,
  containerSize,
  floatIndex,
}: MinimapLineProps) {
  const myCenter = index * (containerSize / (totalLines - 1));
  const scrollPx = useTransform(scrollPos, (val) => val * containerSize);

  const combinedDistance = useTransform([mousePos, scrollPx], (values) => {
    const [mPos, sPos] = values as number[];
    const mouseDist = isFinite(mPos) ? Math.abs(mPos - myCenter) : 2000;
    return Math.min(mouseDist, Math.abs(sPos - myCenter));
  });

  const baseSize = isHeading ? 16 : 8;
  const maxSize = isHeading ? 28 : 24;
  const size = useTransform(combinedDistance, [0, 60], [maxSize, baseSize]);
  const sizeSpring = useSpring(size, { stiffness: 400, damping: 25 });

  const below = Math.floor(floatIndex);
  const isCurrent = index === below || index === below - 1;
  const isScrolledPast = index < below - 1;

  return (
    <motion.div
      className={cn(
        "rounded-full pointer-events-none transition-colors duration-200",
        isCurrent
          ? "bg-black dark:bg-white"
          : isScrolledPast
            ? "bg-black/60 dark:bg-white/60"
            : isHeading
              ? "bg-black dark:bg-white z-10"
              : "bg-black/20 dark:bg-white/20"
      )}
      style={isVertical ? { height: "2px", width: sizeSpring } : { width: "2px", height: sizeSpring }}
    />
  );
}
