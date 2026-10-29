"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/web/PostCard";
import { avatar, followingFeed, people } from "../data";

// A profile (/u/mara) and the Following feed it feeds.
export default function FollowConcept() {
  const mara = people[0];
  const [following, setFollowing] = useState(false);
  const [tab, setTab] = useState<"following" | "all">("following");

  return (
    <>
      <section className="flex items-center gap-5 py-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatar(mara.handle)} alt="" className="size-16 rounded-full" />
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="type-title">{mara.name}</h1>
          <p className="type-meta">@{mara.handle} · {mara.posts} posts</p>
          <p className="type-body">{mara.bio}</p>
        </div>
        <Button variant={following ? "outline" : "default"} onClick={() => setFollowing((f) => !f)}>
          {following ? "Following" : "Follow"}
        </Button>
      </section>

      <section className="section-minimal">
        <div className="flex gap-4">
          {(["following", "all"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`type-label cursor-pointer ${tab === t ? "text-black dark:text-white" : ""}`}
            >
              {t === "following" ? "Following" : "All"}
            </button>
          ))}
        </div>
        <div className="grid gap-2">
          {(tab === "following" ? followingFeed : [...followingFeed].reverse()).map((post) => (
            <div key={post.title}>
              <p className="type-meta text-xs pt-2">
                {people.find((p) => p.handle === post.author)?.name} · {post.when}
              </p>
              <PostCard post={{ slug: "#", title: post.title, topic: post.topic, minRead: post.minutes }} />
            </div>
          ))}
        </div>
        <p className="type-meta">Counts of followers stay private: only you see yours.</p>
      </section>
    </>
  );
}
