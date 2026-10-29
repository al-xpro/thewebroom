"use client";

import { usePathname } from "next/navigation";

// The path that wasn't found, for the 404 page's terminal block.
export function MissingPath() {
  return <>{usePathname()}</>;
}
