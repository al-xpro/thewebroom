"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Flag, Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { showErrorToast } from "@/components/ui/toast";
import { withNext } from "@/lib/next-path";

const REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "plagiarism", label: "Plagiarism" },
  { value: "off-topic", label: "Off-topic" },
  { value: "other", label: "Something else" },
] as const;
type Reason = (typeof REASONS)[number]["value"];

interface ReportButtonProps {
  targetType: "post" | "comment";
  targetId: string;
  authorId: string;
  className?: string;
}

// Flags a post or comment for an admin. Hidden on your own writing; a login link when signed out.
export function ReportButton({ targetType, targetId, authorId, className }: ReportButtonProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.auth.getCurrentUser, isAuthenticated ? undefined : "skip");
  const report = useMutation(api.reports.report);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  const trigger = (
    <Button variant="ghost" size="icon-sm" aria-label="Report" title="Report" className={className}>
      <Flag className="size-4" />
    </Button>
  );

  if (isLoading || (user && user._id === authorId)) return null;
  if (!isAuthenticated) {
    return (
      <Link href={withNext("/auth/login", pathname)} aria-label="Log in to report" title="Report" className={className}>
        <span className="inline-flex size-8 items-center justify-center rounded-full text-[#666666] hover:text-black dark:text-[#A0A0A0] dark:hover:text-white">
          <Flag className="size-4" />
        </span>
      </Link>
    );
  }

  const send = async () => {
    if (!reason) return;
    setPending(true);
    try {
      await report({ targetType, targetId, reason });
      setSent(true);
    } catch (error) {
      showErrorToast((error as { data?: string }).data ?? "Couldn't send the report");
    } finally {
      setPending(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setSent(false);
          setReason(null);
        }
      }}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-4 rounded-2xl border bg-white p-4 dark:bg-black">
        {sent ? (
          <p className="type-meta">Thanks. A person will look at it.</p>
        ) : (
          <>
            <p className="type-heading text-base">What&apos;s wrong?</p>
            <div className="flex flex-wrap gap-1.5">
              {REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReason(r.value)}
                  aria-pressed={reason === r.value}
                  className={`rounded-full px-3 py-1 text-sm cursor-pointer ${
                    reason === r.value ? "bg-black text-white dark:bg-white dark:text-black" : "bg-black/5 dark:bg-white/10"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-1">
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" disabled={!reason || pending} onClick={send}>
                {pending && <Loader2 className="size-4 animate-spin" />}
                Send
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
