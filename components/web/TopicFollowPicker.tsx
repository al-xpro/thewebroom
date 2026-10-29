"use client";

import { Check, Plus } from "lucide-react";
import { TOPICS, type Topic } from "@/convex/topics";
import { cn } from "@/lib/utils";

interface TopicFollowPickerProps {
  selected: Topic[];
  onToggle: (topic: Topic) => void;
  disabled?: boolean;
}

// Every topic as a toggle chip: onboarding and the profile page.
export function TopicFollowPicker({ selected, onToggle, disabled }: TopicFollowPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TOPICS.map((topic) => {
        const on = selected.includes(topic);
        return (
          <button
            key={topic}
            type="button"
            disabled={disabled}
            aria-pressed={on}
            onClick={() => onToggle(topic)}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              on ? "bg-[#FFEDE8] dark:bg-[#1C0100] text-primary" : "bg-[#EDEDED] dark:bg-[#202020]"
            )}
          >
            {on ? <Check className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
            {topic}
          </button>
        );
      })}
    </div>
  );
}
