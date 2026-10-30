import { cn } from "@/lib/utils";

// A status as a coloured dot and a word: colour carries the meaning, the text stays quiet.
const DOTS: Record<string, string> = {
  published: "bg-[#3FA35B]",
  active: "bg-[#3FA35B]",
  draft: "bg-[#A0A0A0] dark:bg-[#666666]",
  scheduled: "bg-primary",
  hidden: "bg-destructive",
  flagged: "bg-destructive",
  banned: "bg-destructive",
  admin: "bg-black dark:bg-white",
};

export function StatusBadge({ status, className }: { status?: string; className?: string }) {
  const value = status || "published";
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 text-xs font-light text-[#666666] dark:text-[#A0A0A0]", className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", DOTS[value] ?? DOTS.draft)} />
      {value}
    </span>
  );
}
