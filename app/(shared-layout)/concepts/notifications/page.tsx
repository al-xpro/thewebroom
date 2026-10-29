"use client";

import { useState } from "react";
import { avatar, notifications, people } from "../data";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "reply", label: "Replies" },
  { key: "follow", label: "Follows" },
  { key: "post", label: "Posts" },
] as const;

// Only what involves you, newest first; unread is a dot, not a badge count.
export default function NotificationsConcept() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [read, setRead] = useState(false);
  const shown = notifications.filter((n) => filter === "all" || n.kind === filter);

  return (
    <>
      <div className="flex items-end justify-between gap-4 py-10">
        <h1 className="type-display">Notifications</h1>
        <button type="button" onClick={() => setRead(true)} className="type-meta hover:text-black dark:hover:text-white cursor-pointer">
          Mark all read
        </button>
      </div>
      <div className="flex gap-1 pb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1 text-sm cursor-pointer ${
              filter === f.key ? "bg-black text-white dark:bg-white dark:text-black" : "text-[#666666] dark:text-[#A0A0A0]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <ul>
        {shown.map((n, i) => {
          const who = people.find((p) => p.handle === n.who);
          const unread = n.unread && !read;
          return (
            <li key={i} className="relative divider-fade-top flex items-center gap-3 py-4">
              <span aria-label={unread ? "Unread" : undefined} className={`size-1.5 rounded-full ${unread ? "bg-primary" : "bg-transparent"}`} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatar(n.who)} alt="" className="size-8 rounded-full" />
              <p className={`flex-1 text-sm ${unread ? "font-normal text-black dark:text-white" : "font-light text-[#666666] dark:text-[#A0A0A0]"}`}>
                <span className="font-medium">{who?.name}</span> {n.text}
              </p>
              <span className="type-meta text-xs">{n.when}</span>
            </li>
          );
        })}
      </ul>
      <p className="type-meta py-6">A weekly e-mail digest is off unless you turn it on.</p>
    </>
  );
}
