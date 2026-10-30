"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useConvexAuth } from "convex/react";
import { useTransition } from "react";
import { Check, Plus } from "lucide-react";
import { TOPICS } from "@/convex/topics";
import { useTopicFollows } from "@/hooks/use-topic-follows";

const FILTERS = TOPICS.map((topic) => ({ key: topic, label: topic }));

interface BlogFiltersProps {
  activeTopics: string[];
}

export default function BlogFilters({ activeTopics }: BlogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const { canFollow, isFollowing, toggle: toggleFollow } = useTopicFollows();
  const { isAuthenticated, isLoading } = useConvexAuth();

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
      {FILTERS.map((filter) => {
        const active = activeTopics.includes(filter.key);
        const chip = active ? "bg-[#FFEDE8] dark:bg-[#1C0100] text-primary" : "bg-[#EDEDED] dark:bg-[#202020]";
        const following = canFollow && isFollowing(filter.key);
        return (
          <div key={filter.key} className="inline-flex">
            <button
              onClick={() => toggle(filter.key)}
              aria-pressed={active}
              className={`px-4 py-2 text-sm cursor-pointer transition-colors rounded-l-full pr-3 ${chip}`}
            >
              {filter.label}
            </button>
            {/* Always there, so the chips never change width as sign-in state loads: signed
                out it links to login, while loading it waits. */}
            {!isLoading && !isAuthenticated ? (
              <Link
                href={`/auth/login?next=${encodeURIComponent("/posts")}`}
                aria-label={`Log in to follow ${filter.label}`}
                title={`Follow ${filter.label}`}
                className={`inline-flex items-center pl-2 pr-3 rounded-r-full border-l border-black/10 dark:border-white/10 text-paragraph hover:text-primary ${chip}`}
              >
                <Plus className="size-4" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => canFollow && toggleFollow(filter.key)}
                disabled={!canFollow}
                aria-pressed={following}
                aria-label={following ? `Unfollow ${filter.label}` : `Follow ${filter.label}`}
                title={following ? `Unfollow ${filter.label}` : `Follow ${filter.label}`}
                className={`pl-2 pr-3 rounded-r-full cursor-pointer transition-colors border-l border-black/10 dark:border-white/10 disabled:cursor-default ${chip} ${
                  following ? "text-primary" : "text-paragraph hover:text-primary"
                }`}
              >
                {following ? <Check className="size-4" /> : <Plus className="size-4" />}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
