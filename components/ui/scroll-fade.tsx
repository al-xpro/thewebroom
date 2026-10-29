"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

const FADE = "28px";

// A scroll container whose top and bottom edges fade out, each only while there's more
// to scroll that way. A mask rather than an overlay, so it works on any background.
export function ScrollFade({ className, style, children, ...props }: ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const top = el.scrollTop > 1;
      const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
      setEdges((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(el);
    for (const child of Array.from(el.children)) resize.observe(child);
    const mutations = new MutationObserver(update);
    mutations.observe(el, { childList: true, subtree: true });

    return () => {
      el.removeEventListener("scroll", update);
      resize.disconnect();
      mutations.disconnect();
    };
  }, []);

  const mask = `linear-gradient(to bottom, ${edges.top ? "transparent" : "#000"} 0, #000 ${FADE}, #000 calc(100% - ${FADE}), ${edges.bottom ? "transparent" : "#000"} 100%)`;

  return (
    <div
      ref={ref}
      className={cn("overflow-y-auto", className)}
      style={{ ...style, maskImage: mask, WebkitMaskImage: mask }}
      {...props}
    >
      {children}
    </div>
  );
}
