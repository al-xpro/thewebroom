"use client";

import { useEffect, useState } from "react";

// When the component mounted, read in the browser; null on the server and while hydrating
// (a prerendered page can't read the clock). It doesn't tick.
export function useMountTime() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setNow(Date.now()));
    return () => cancelAnimationFrame(frame);
  }, []);
  return now;
}
