"use client";

import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Single avatar with tooltip + animations

function AnimatedAvatar({
  imageUrl,
  name,
  index,
  total,
}: {
  imageUrl: string;
  name: string;
  index: number;
  total: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      className="relative"
      style={{ zIndex: hovered ? total + 10 : total - index }}
      initial={{ opacity: 0, scale: 0.5, x: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{
        delay: index * 0.06,
        type: "spring",
        stiffness: 300,
        damping: 20,
      }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            className="absolute -top-9 left-1/2 -translate-x-1/2 pointer-events-none"
            initial={{ opacity: 0, y: 6, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <div className="relative whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium bg-[#FFEDE8] dark:bg-[#1C0100] text-primary shadow-lg">
              {name}
              {/* Arrow */}
              <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-[#FFEDE8] dark:bg-[#1C0100] rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar */}
      <motion.div
        className="relative"
        animate={hovered ? { y: -4, scale: 1.15 } : { y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 18 }}
      >
        {/* Glow ring on hover */}
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/40 blur-md"
          animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1.3 : 1 }}
          transition={{ duration: 0.2 }}
        />
        <img
          src={imageUrl}
          alt={name}
          width={36}
          height={36}
          className={cn(
            "relative h-9 w-9 rounded-full object-cover",
            "border-2 border-white dark:border-black",
            "transition-shadow duration-200",
            hovered && "shadow-lg shadow-primary/30"
          )}
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://avatar.vercel.sh/${name}`;
          }}
        />
      </motion.div>
    </motion.div>
  );
}

// ── Overflow count pill ───────────────────────────────────────────────────────

function OverflowPill({
  count,
  index,
}: {
  count: number;
  index: number;
}) {
  return (
    <motion.div
      className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white dark:border-black bg-black dark:bg-white text-white dark:text-black text-xs font-bold shadow-sm"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 300, damping: 20 }}
    >
      +{count}
    </motion.div>
  );
}

// Main component 

interface AvatarCirclesProps {
  className?: string;
  /** Shown in the overflow pill. If omitted, total registered users is used. */
  numPeople?: number;
}

export function AvatarCircles({ className, numPeople }: AvatarCirclesProps) {
  const users = useQuery(api.auth.getRecentUsers);

  if (!users) {
    // Skeleton state
    return (
      <div className={cn("flex -space-x-3", className)}>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-9 w-9 rounded-full bg-muted border-2 border-white dark:border-black animate-pulse"
            style={{ opacity: 1 - i * 0.15 }}
          />
        ))}
      </div>
    );
  }

  const overflow = numPeople ?? 0;

  return (
    <div className={cn("flex -space-x-3 cursor-pointer rtl:space-x-reverse items-center", className)}>
      {users.map((user, i) => (
        <AnimatedAvatar
          key={user.id}
          imageUrl={user.imageUrl}
          name={user.name}
          index={i}
          total={users.length}
        />
      ))}
      {overflow > 0 && (
        <OverflowPill count={overflow} index={users.length} />
      )}
    </div>
  );
}