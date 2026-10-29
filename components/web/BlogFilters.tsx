"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
import { TOPICS } from "@/convex/topics";

const FILTERS = TOPICS.map((topic) => ({ key: topic, label: topic }));

interface BlogFiltersProps {
  activeTopics: string[];
}

export default function BlogFilters({ activeTopics }: BlogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const toggle = (key: string) => {
    const next = activeTopics.includes(key)
      ? activeTopics.filter((t) => t !== key)
      : [...activeTopics, key];

    const search = next.length > 0 ? `?topics=${next.join(",")}` : "";

    startTransition(() => {
      router.push(`${pathname}${search}`, { scroll: false });
    });
  };

  return (
    <div className="flex gap-2 flex-wrap transition-opacity">
      {FILTERS.map((filter) => (
        <button
          key={filter.key}
          onClick={() => toggle(filter.key)}
          className={`px-4 py-2 rounded-full text-sm cursor-pointer transition-colors ${
            activeTopics.includes(filter.key)
              ? "bg-[#FFEDE8] dark:bg-[#1C0100] text-primary"
              : "bg-[#EDEDED] dark:bg-[#202020]"
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
