"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { PostCard } from "@/components/web/PostCard";

const PAGE_SIZE = 10;

// Ten posts, then More adds ten at a time.
export default function PaginatedPosts({ posts }: { posts: any[] }) {
  const [visible, setVisible] = useState(PAGE_SIZE);

  return (
    <div className="grid gap-6 py-10">
      {posts.slice(0, visible).map((post) => (
        <PostCard key={post._id} post={post} />
      ))}

      {visible < posts.length && (
        <Button
          variant="outline"
          className="justify-self-center"
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
        >
          More
        </Button>
      )}
    </div>
  );
}
