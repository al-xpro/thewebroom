import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type DockPosition = "bottom" | "top" | "left" | "right";
export type DockGroup = "write" | "people" | "you";

export interface DockEntry {
  key: string;
  label: ReactNode;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  group?: DockGroup;
  // Shows the member's photo instead of the icon when there is one.
  avatar?: boolean;
  // A small dot for something new (unread notifications).
  dot?: boolean;
}

// A label for the tooltip, keyed so it can be measured once per set of items.
export interface DockLabel {
  key: string;
  label: ReactNode;
}
