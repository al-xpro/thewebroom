"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type ProgressiveBlurProps = {
  className?: string;
  position?: "top" | "bottom";
  height?: string;
  blurAmount?: string;
  opacity?: number;
};

const ProgressiveBlur = ({
  className = "",
  position = "top",
  height = "150px",
  blurAmount = "4px",
  opacity = 1,
}: ProgressiveBlurProps) => {
  const isTop = position === "top";

  return (
    <div
      className={`pointer-events-none fixed left-0 w-full select-none z-40 ${className}`}
      style={{
        [isTop ? "top" : "bottom"]: 0,
        height,
        opacity,
        transition: "opacity 0.4s ease",
        maskImage: isTop
          ? `linear-gradient(to bottom, black 50%, transparent)`
          : `linear-gradient(to top, black 50%, transparent)`,
        WebkitMaskImage: isTop
          ? `linear-gradient(to bottom, black 50%, transparent)`
          : `linear-gradient(to top, black 50%, transparent)`,
        WebkitBackdropFilter: `blur(${blurAmount})`,
        backdropFilter: `blur(${blurAmount})`,
      }}
    />
  );
};

export function PageBlurOverlay() {
  const pathname = usePathname();
  const [topOpacity, setTopOpacity] = useState(0);
  const [bottomOpacity, setBottomOpacity] = useState(1);

  const showBlur =
    (pathname?.startsWith("/posts/") && pathname !== "/posts") ||
    pathname?.includes("privacy-policy") ||
    pathname?.includes("terms-and-conditions");

  useEffect(() => {
    if (!showBlur) return;

    const updateOpacity = () => {
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const threshold = 80; // px from top/bottom to start fading

      // Top blur: hidden at top, visible once scrolled down
      setTopOpacity(Math.min(scrollY / threshold, 1));

      // Bottom blur: visible at top, hidden at bottom
      setBottomOpacity(Math.min((maxScroll - scrollY) / threshold, 1));
    };

    updateOpacity();
    window.addEventListener("scroll", updateOpacity, { passive: true });
    return () => window.removeEventListener("scroll", updateOpacity);
  }, [showBlur, pathname]);

  if (!showBlur) return null;

  return (
    <>
      <ProgressiveBlur position="top" height="120px" blurAmount="6px" opacity={topOpacity} />
      <ProgressiveBlur position="bottom" height="120px" blurAmount="6px" opacity={bottomOpacity} />
    </>
  );
}