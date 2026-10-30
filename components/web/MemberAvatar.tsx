import { cn } from "@/lib/utils";

// A member's photo, or a generated one from their name.
export function MemberAvatar({ name, url, className }: { name: string; url?: string | null; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url || `https://avatar.vercel.sh/${encodeURIComponent(name || "member")}`}
      alt=""
      className={cn("size-9 shrink-0 rounded-full object-cover", className)}
    />
  );
}
