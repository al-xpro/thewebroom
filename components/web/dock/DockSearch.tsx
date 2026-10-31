"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { BookText, Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { ScrollFade } from "@/components/ui/scroll-fade";
import { escapeRegExp, extractTextFromHtml, getExcerpt } from "@/lib/search-text";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 500;

function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <>{text}</>;

  const parts = text.split(new RegExp(`(${escapeRegExp(highlight)})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} className="bg-yellow-200 dark:bg-yellow-900 text-foreground rounded-[2px] px-0.5">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

interface DockSearchProps {
  inputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
}

// The dock opened as a search over the published posts: titles, subtitles and bodies,
// with arrow keys and Enter to pick one.
export function DockSearch({ inputRef, onClose }: DockSearchProps) {
  const posts = useQuery(api.posts.getPublishedPosts);
  const router = useRouter();

  const [displayTerm, setDisplayTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [usingKeyboard, setUsingKeyboard] = useState(false);
  const [mouseMoved, setMouseMoved] = useState(false);

  useEffect(() => {
    if (!displayTerm) return;
    const handler = setTimeout(() => setDebouncedTerm(displayTerm), DEBOUNCE_MS);
    return () => clearTimeout(handler);
  }, [displayTerm]);

  // An empty box clears the results at once; anything typed waits for the pause.
  const term = displayTerm ? debouncedTerm : "";
  const isDebouncing = displayTerm !== "" && displayTerm !== debouncedTerm;

  const results = useMemo(() => {
    if (!term || !posts) return null;
    const lower = term.toLowerCase();
    return posts.filter(
      (post) =>
        post.title.toLowerCase().includes(lower) ||
        (post.subtitle ?? "").toLowerCase().includes(lower) ||
        extractTextFromHtml(post.body ?? "").toLowerCase().includes(lower)
    );
  }, [term, posts]);

  useEffect(() => {
    if (activeIndex < 0) return;
    itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex]);

  return (
    <div className="flex flex-col h-full w-full bg-transparent min-w-[320px]">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border/40 shrink-0 min-w-0">
        <input
          name="search"
          ref={inputRef}
          value={displayTerm}
          maxLength={50}
          onKeyDown={(e) => {
            if (!results || results.length === 0) return;

            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setUsingKeyboard(true);
              setMouseMoved(false);
              setActiveIndex((prev) => {
                if (e.key === "ArrowDown") return prev < results.length - 1 ? prev + 1 : 0;
                return prev > 0 ? prev - 1 : results.length - 1;
              });
            }

            if (e.key === "Enter" && activeIndex >= 0) {
              e.preventDefault();
              const selected = results[activeIndex];
              if (selected) {
                router.push(`/posts/${selected.slug}`);
                onClose();
              }
            }
          }}
          onChange={(e) => setDisplayTerm(e.target.value)}
          placeholder="What are you searching for?"
          className="flex-1 bg-transparent text-lg outline-none placeholder:text-paragraph text-foreground truncate"
          autoFocus
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            name="esc"
            className="text-[10px] uppercase font-bold text-paragraph border border-[#EAEAEA] dark:border-[#1E1E1E] px-1.5 py-0.5 rounded hover:bg-[#d9d9d9] dark:hover:bg-[#1E1E1E] transition-colors cursor-pointer"
          >
            Esc
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative">
        {isDebouncing ? (
          <div className="flex items-center justify-center h-full text-paragraph gap-2">
            <Loader2 className="animate-spin size-4" />
          </div>
        ) : !results && !displayTerm ? (
          <div className="flex flex-col items-center justify-center h-full text-paragraph gap-2 select-none">
            <BookText className="size-12 opacity-20" />
            <span className="text-sm font-medium">Type to search blog posts</span>
          </div>
        ) : results && results.length === 0 ? (
          <div className="flex items-center justify-center h-full px-6">
            <p className="text-paragraph text-sm truncate max-w-full text-center">No results found for &quot;{term}&quot;</p>
          </div>
        ) : (
          <ScrollFade
            className="h-full p-2"
            onMouseMove={() => {
              if (usingKeyboard) {
                setUsingKeyboard(false);
                setMouseMoved(true);
              }
            }}
          >
            <div className="flex flex-col gap-1">
              {results?.map((post, index) => (
                <Link
                  key={post.slug}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  href={`/posts/${post.slug}`}
                  onClick={onClose}
                  onMouseEnter={() => {
                    if (usingKeyboard && !mouseMoved) return;
                    setActiveIndex(index);
                  }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl transition-all text-left min-w-0 overflow-hidden",
                    activeIndex === index
                      ? "bg-[#F4F4F5] dark:bg-[#1E1E1E]"
                      : !usingKeyboard
                        ? "hover:bg-[#F4F4F5] dark:hover:bg-[#1E1E1E]"
                        : ""
                  )}
                >
                  <BookText className="size-5 shrink-0" />

                  <div className="flex flex-col min-w-0 flex-1">
                    <h4 className="text-sm font-medium truncate">
                      <HighlightedText text={post.title} highlight={term} />
                    </h4>

                    {post.subtitle && (
                      <p className="text-xs text-paragraph mt-0.5 truncate">
                        <HighlightedText text={post.subtitle} highlight={term} />
                      </p>
                    )}

                    {post.body && (
                      <p className="text-xs text-paragraph mt-1 truncate">
                        <HighlightedText text={getExcerpt(extractTextFromHtml(post.body), term)} highlight={term} />
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </ScrollFade>
        )}
      </div>
    </div>
  );
}
