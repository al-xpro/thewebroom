"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Separator } from "../ui/separator";
import {
  Sun,
  Moon,
  Pencil,
  Search,
  Loader2,
  BookText,
  GripHorizontal,
  GripVertical,
} from "lucide-react";
import { AnimatedThemeToggler } from "../ui/animated-theme-toggle";
import { NavbarDataBlog, NavbarDataUser, NavbarDataUnauth } from "@/lib/data";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Skeleton } from "../ui/skeleton";
import {
  AnimatePresence,
  motion,
  PanInfo,
  useMotionValue,
  useSpring,
  useTransform,
  MotionValue,
  useDragControls,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { Kbd } from "../ui/kbd";

// Types
type DockPosition = "bottom" | "top" | "left" | "right";

// --- HOOK: Reading Progress & Headings (Enhanced) ---
function useReadingProgress() {
  const [completion, setCompletion] = useState(0);
  const [headings, setHeadings] = useState<number[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    setCompletion(0);
    setHeadings([]);
  }, [pathname]);

  useEffect(() => {
    const updateMetrics = () => {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;

      // 1. Update Scroll Progress
      if (scrollableHeight > 0) {
        setCompletion(window.scrollY / scrollableHeight);
      }

      // 2. Update Headings Positions
      // We map the heading's absolute top position to the scrollable percentage.
      // This ensures the marker aligns with the scroll thumb (orange line).
      const elements = Array.from(document.querySelectorAll("article h1, article h2, article h3"));

      const newHeadings = elements.map((el) => {
        const rect = el.getBoundingClientRect();
        const absoluteTop = rect.top + window.scrollY;
        // The scrollbar thumb represents the viewport's position relative to scrollable area.
        // We want the marker to appear where the scroll thumb WOULD be when that heading is at the top.
        return Math.min(Math.max(absoluteTop / scrollableHeight, 0), 1);
      });

      // Simple array diff check to avoid unnecessary re-renders
      setHeadings((prev) => {
        if (
          prev.length === newHeadings.length &&
          prev.every((val, i) => Math.abs(val - newHeadings[i]) < 0.001)
        ) {
          return prev;
        }
        return newHeadings;
      });
    };

    // Initial call
    updateMetrics();

    // Listeners
    window.addEventListener("scroll", updateMetrics);
    window.addEventListener("resize", updateMetrics);

    // ROBUSTNESS: Use ResizeObserver to detect content loading (images, etc)
    const resizeObserver = new ResizeObserver(() => {
      updateMetrics();
    });
    resizeObserver.observe(document.body);

    return () => {
      window.removeEventListener("scroll", updateMetrics);
      window.removeEventListener("resize", updateMetrics);
      resizeObserver.disconnect();
    };
  }, [pathname]);

  return { completion, headings };
}

export function DockNavigation() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const pathname = usePathname();
  const isPostRoute =
    ((pathname?.startsWith("/posts/") && pathname !== "/posts") ||
      pathname?.startsWith("/post/")) ??
    false;
  const isPostPage =
    isPostRoute ||
    pathname?.includes("privacy-policy") ||
    pathname?.startsWith("/create") ||
    pathname?.startsWith("/edit/") ||
    pathname?.includes("terms-and-conditions");
  const [isMounted, setIsMounted] = useState(false);
  const [allowDrag, setAllowDrag] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSnapping, setIsSnapping] = useState(false);
  const isTrackScrollingRef = useRef(false);
  const [dockSize, setDockSize] = useState({ width: 0, height: 0 });
  const [postExists, setPostExists] = useState(false);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    setPostExists(false);

    if (!isPostPage) return;

    if (document.querySelector("article")) {
      setPostExists(true);
      return;
    }

    const observer = new MutationObserver(() => {
      if (document.querySelector("article")) {
        setPostExists(true);
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname, isPostPage]);

  const showMinimap = isPostPage && postExists;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { completion, headings } = useReadingProgress();

  // --- Dock State ---
  const [position, setPosition] = useState<DockPosition>("bottom");
  const [isSearching, setIsSearching] = useState(false);

  const [isLayoutAnimating, setIsLayoutAnimating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const isVertical = (position === "left" || position === "right") && !isSearching;

  // --- Drag Controls ---
  // We use dragControls to allow dragging ONLY from the specific Grip icon
  const dragControls = useDragControls();

  // --- Search Logic ---
  const [term, setTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // --- Tooltip State ---
  const dockRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [prevHoveredIndex, setPrevHoveredIndex] = useState<number>(0);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { stiffness: 350, damping: 30 };
  const xSpring = useSpring(mouseX, springConfig);
  const ySpring = useSpring(mouseY, springConfig);

  // --- Labels ---
  const dockLabels = useMemo(() => {
    const labels = [
      ...NavbarDataBlog.map((item) => item.label),
      <div key="search-label">
        Search &nbsp;<Kbd>⌘</Kbd> <Kbd>K</Kbd>
      </div>,
      "Create",
    ];

    if (!isLoading) {
      const authItems = isAuthenticated ? NavbarDataUser : NavbarDataUnauth;
      labels.push(...authItems.map((i) => i.label));
    } else {
      labels.push("", "");
    }

    labels.push("Theme");
    return labels;
  }, [isAuthenticated, isLoading]);

  const handleItemHover = (e: React.MouseEvent<HTMLElement>, index: number) => {
    if (isDragging || isSearching || isLayoutAnimating) return;
    if (!dockRef.current) return;

    const buttonRect = e.currentTarget.getBoundingClientRect();
    const dockRect = dockRef.current.getBoundingClientRect();

    if (isVertical) {
      const safeCenterY = buttonRect.top - dockRect.top + buttonRect.height / 2;
      mouseY.set(safeCenterY);
    } else {
      const buttonCenterX = buttonRect.left - dockRect.left + buttonRect.width / 2;
      mouseX.set(buttonCenterX);
    }

    if (hoveredIndex !== null && hoveredIndex !== index) {
      setPrevHoveredIndex(hoveredIndex);
    }
    setHoveredIndex(index);
  };

  const handleItemLeave = () => {
    if (hoveredIndex !== null) {
      setPrevHoveredIndex(hoveredIndex);
    }
    setHoveredIndex(null);
  };

  useEffect(() => {
    setIsLayoutAnimating(true);
    setHoveredIndex(null);
    const t = setTimeout(() => setIsLayoutAnimating(false), 200);
    return () => clearTimeout(t);
  }, [position]);

  useEffect(() => {
    setIsLayoutAnimating(true);
    setHoveredIndex(null);
    const t = setTimeout(() => {
      setIsLayoutAnimating(false);
      if (isSearching) inputRef.current?.focus();
    }, 350);
    return () => clearTimeout(t);
  }, [isSearching]);

  // --- Drag Logic ---
  const handleDragStart = () => {
    isDraggingRef.current = true;
    setIsDragging(true);
    setHoveredIndex(null);
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    isDraggingRef.current = false;
    setIsDragging(false);
    setIsSnapping(true);
    setHoveredIndex(null);

    const w = window.innerWidth;
    const h = window.innerHeight;

    let clientX = 0;
    let clientY = 0;

    if (event instanceof MouseEvent || event instanceof PointerEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else if (event instanceof TouchEvent && event.changedTouches.length > 0) {
      clientX = event.changedTouches[0].clientX;
      clientY = event.changedTouches[0].clientY;
    } else {
      clientX = info.point.x;
      clientY = info.point.y;
    }

    const slope = h / w;
    let newPos: DockPosition = "bottom";
    if (clientY < clientX * slope && clientY < h - clientX * slope) newPos = "top";
    else if (clientY > clientX * slope && clientY > h - clientX * slope) newPos = "bottom";
    else if (clientY > clientX * slope && clientY < h - clientX * slope) newPos = "left";
    else newPos = "right";

    if (newPos !== position) setPosition(newPos);
    setTimeout(() => setIsSnapping(false), 600);
  };

  useEffect(() => {
    if (!showMinimap) return;

    const prevent = (e: TouchEvent) => {
      if (isDraggingRef.current) {
        e.preventDefault();
      }
    };

    document.body.addEventListener("touchmove", prevent, { passive: false });
    return () => document.body.removeEventListener("touchmove", prevent);
  }, [showMinimap]);

  useEffect(() => {
    if (isDragging || isSnapping) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [isDragging, isSnapping]);

  const dragY = useMotionValue(0);

  useEffect(() => {
    if (!showMinimap || !isVertical) return; // only clamp when vertical

    const unsubscribe = dragY.on("change", (y) => {
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const halfDock = dockSize.height / 2;
      const padding = 24;
      const maxY = vh / 2 - halfDock - padding;
      if (y < -maxY) dragY.set(-maxY);
      if (y > maxY) dragY.set(maxY);
    });

    return unsubscribe;
  }, [showMinimap, isVertical, dragY, dockSize.height]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault(); // Prevent default immediately

        if (isPostPage && isScrolling) return;

        if (isSearching) {
          // If closing, blur input first to prevent Safari jump
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          setIsSearching(false);
        } else {
          // Save scroll position if needed, though usually not necessary for opening
          const scrollY = window.scrollY;
          setIsSearching(true);
          // Optional: Restore scroll if opening causes a jump (rare)
          requestAnimationFrame(() =>
            window.scrollTo({ top: scrollY, behavior: "instant" as any })
          );
        }
      }

      if (e.key === "Escape" && isSearching) {
        e.preventDefault(); // Prevent default immediately

        // Blur input first
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }

        setIsSearching(false);
        // We don't strictly need scrollTo here if we blur properly,
        // but keeping your existing logic safely doesn't hurt.
        const scrollY = window.scrollY;
        requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "instant" as any }));
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSearching, isPostPage, isScrolling]);

  useEffect(() => {
    if (!isPostPage) return;
    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => setIsScrolling(false), 300);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [isPostPage]);

  useEffect(() => {
    if (!isSearching) setTerm("");
  }, [isSearching]);

  const getContainerStyles = () => {
    const base =
      "fixed inset-0 z-50 flex p-16 pointer-events-none transition-all duration-500 ease-in-out min-w-[320px]";
    if (isSearching) return cn(base, "items-center justify-center");
    const positions = {
      bottom: "items-end justify-center",
      top: "items-start justify-center",
      left: "items-center justify-start",
      right: "items-center justify-end",
    };
    return cn(base, positions[position]);
  };

  const dragConstraints = useMemo(() => {
    if (typeof window === "undefined") return { top: 0, bottom: 0, left: 0, right: 0 };
    const padding = 24;
    const vw = window.visualViewport?.width ?? window.innerWidth;
    const vh = window.visualViewport?.height ?? window.innerHeight;
    const maxX = (vw - dockSize.width) / 2 - padding;
    const maxY = (vh - dockSize.height) / 2 - padding;
    return {
      top: -maxY,
      bottom: maxY,
      left: -maxX,
      right: maxX,
    };
  }, [dockSize]);

  useEffect(() => {
    if (!dockRef.current) return;
    const update = () => {
      if (dockRef.current) {
        setDockSize({
          width: dockRef.current.offsetWidth,
          height: dockRef.current.offsetHeight,
        });
      }
    };
    const ro = new ResizeObserver(update);
    ro.observe(dockRef.current);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    if (dockRef.current) {
      setDockSize({
        width: dockRef.current.offsetWidth,
        height: dockRef.current.offsetHeight,
      });
    }
  }, [showMinimap]);

  let renderIndex = 0;
  const getIndex = () => renderIndex++;
  const showTooltips = isMounted && !isSearching && !isDragging && !isLayoutAnimating;

  if (!isMounted) return null;

  return (
    <>
      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSearching(false)}
            role="button"
            aria-label="close search"
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {(!isPostPage || postExists) && (
          <div className={getContainerStyles()} ref={containerRef}>
            <motion.div
              ref={dockRef}
              layout // Crucial for fluid transition between Dock and Minimap sizes
              drag={!isSearching && allowDrag && !(showMinimap && isScrolling)}
              dragControls={dragControls}
              dragMomentum={false}
              dragElastic={1.0}
              onDragStart={handleDragStart}
              onPointerDown={(e) => {
                if (!showMinimap) return;
                if (isScrolling || isTrackScrollingRef.current) return;
                isDraggingRef.current = true;
                document.documentElement.style.overflow = "hidden";
                document.body.style.overflow = "hidden";
                dragControls.start(e);
              }}
              onPointerUp={() => {
                if (!isDragging) {
                  // Tap without drag — unlock scroll immediately
                  isDraggingRef.current = false;
                  document.documentElement.style.overflow = "";
                  document.body.style.overflow = "";
                }
              }}
              onPointerCancel={() => {
                if (!isDragging) {
                  isDraggingRef.current = false;
                  document.documentElement.style.overflow = "";
                  document.body.style.overflow = "";
                }
              }}
              onDragEnd={handleDragEnd}
              dragConstraints={dragConstraints}
              dragSnapToOrigin
              dragTransition={{ bounceStiffness: 600, bounceDamping: 100 }}
              onMouseLeave={handleItemLeave}
              style={showMinimap ? { y: dragY } : undefined}
              className={cn(
                "relative flex gap-2 rounded-2xl border border-[#EAEAEA] dark:border-[#1E1E1E] bg-white dark:bg-black shadow-2xl backdrop-blur-2xl transition-colors pointer-events-auto cursor-grab active:cursor-grabbing",
                isSearching
                  ? "w-[550px] h-[450px] max-w-[90vw] max-h-[80vh] min-w-[320px] flex-col p-0 overflow-hidden cursor-default active:cursor-default truncate"
                  : showMinimap
                    ? isVertical
                      ? "w-14 min-h-[350px] max-h-[400px] h-full flex-col py-3 items-center overflow-hidden touch-none"
                      : "w-[400px] h-14 flex-row px-3 items-center overflow-hidden touch-none"
                    : isVertical
                      ? "w-16 h-auto flex-col p-2"
                      : "w-auto h-16 flex-row scale-92 sm:scale-100 p-2"
              )}
            >
              {/* Tooltips */}
              {showTooltips && !showMinimap && (
                <>
                  {isVertical ? (
                    <VerticalTooltip
                      items={dockLabels}
                      hoveredIndex={hoveredIndex}
                      prevHoveredIndex={prevHoveredIndex}
                      ySpring={ySpring}
                      position={position}
                    />
                  ) : (
                    <HorizontalTooltip
                      items={dockLabels}
                      hoveredIndex={hoveredIndex}
                      prevHoveredIndex={prevHoveredIndex}
                      xSpring={xSpring}
                      position={position}
                    />
                  )}
                </>
              )}

              <AnimatePresence mode="wait">
                {isSearching ? (
                  <motion.div
                    key="search"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0 } }}
                    className="flex flex-col w-full h-full"
                  >
                    <DockSearchContent
                      initialTerm={term}
                      inputRef={inputRef}
                      onClose={() => setIsSearching(false)}
                      router={router}
                    />
                  </motion.div>
                ) : showMinimap ? (
                  // --- MINIMAP MODE ---
                  <Minimap
                    key="minimap"
                    completion={completion}
                    headings={headings}
                    isVertical={isVertical}
                    dragControls={dragControls}
                    isScrolling={isScrolling}
                    isDragging={isDragging}
                    isDraggingRef={isDraggingRef}
                    onTrackPointerEnter={() => setAllowDrag(false)}
                    onTrackPointerLeave={() => setAllowDrag(true)}
                    onTrackScrollStart={() => {
                      isTrackScrollingRef.current = true;
                    }}
                    onTrackScrollEnd={() => {
                      isTrackScrollingRef.current = false;
                    }}
                    isTrackScrollingRef={isTrackScrollingRef}
                  />
                ) : (
                  // --- DOCK MODE ---
                  <motion.div
                    key="dock"
                    initial={{ opacity: 0, y: isVertical ? 0 : 20, x: isVertical ? 20 : 0 }}
                    animate={{ opacity: 1, y: 0, x: 0, transition: { delay: 0.5 } }}
                    exit={{
                      opacity: 0,
                      y: isVertical ? 0 : 20,
                      x: isVertical ? 20 : 0,
                      transitionEnd: { display: "none" },
                    }}
                    transition={{ duration: 0.1, ease: "easeOut" }}
                    className={cn(
                      "flex items-center justify-center w-full h-full",
                      isVertical ? "flex-col" : "flex-row",
                      isDragging && "pointer-events-none"
                    )}
                  >
                    {/* DOCK ITEMS RENDER */}
                    {NavbarDataBlog.map((item) => (
                      <DockItem key={item.label} index={getIndex()} onHover={handleItemHover}>
                        <Link href={item.href} aria-label={item.label}>
                          <DockIconWrapper>
                            <item.icon className="size-5" />
                          </DockIconWrapper>
                        </Link>
                      </DockItem>
                    ))}

                    <DockItem index={getIndex()} onHover={handleItemHover}>
                      <button onClick={() => setIsSearching(true)} aria-label="search">
                        <DockIconWrapper>
                          <Search className="size-5" />
                        </DockIconWrapper>
                      </button>
                    </DockItem>

                    <DockItem index={getIndex()} onHover={handleItemHover}>
                      <Link href="/create" aria-label="create">
                        <DockIconWrapper>
                          <Pencil className="size-5" />
                        </DockIconWrapper>
                      </Link>
                    </DockItem>

                    {!isLoading &&
                      (isAuthenticated ? NavbarDataUser : NavbarDataUnauth).map((item) => (
                        <DockItem key={item.label} index={getIndex()} onHover={handleItemHover}>
                          <Link href={item.href} aria-label={item.label}>
                            <DockIconWrapper>
                              <item.icon className="size-5" />
                            </DockIconWrapper>
                          </Link>
                        </DockItem>
                      ))}

                    {isLoading && (
                      <div className={cn("flex gap-2", isVertical ? "flex-col" : "flex-row")}>
                        <div className="hidden">{getIndex()}</div>
                        <div className="hidden">{getIndex()}</div>
                        <Skeleton className="size-9 rounded-xl" />
                        <Skeleton className="size-9 rounded-xl" />
                      </div>
                    )}

                    <DockItem index={getIndex()} onHover={handleItemHover}>
                      <AnimatedThemeToggler className="w-full h-full block" aria-label="theme">
                        <DockIconWrapper>
                          <div className="relative w-full h-full flex items-center justify-center">
                            <Sun className="size-5 absolute scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                            <Moon className="size-5 absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                          </div>
                        </DockIconWrapper>
                      </AnimatedThemeToggler>
                    </DockItem>

                    <Separator
                      orientation={isVertical ? "horizontal" : "vertical"}
                      className={cn(
                        "bg-border/60 relative",
                        isVertical ? "w-8 h-[1px] top-1" : "h-8 w-[1px] left-1"
                      )}
                    />

                    <div
                      onPointerDown={(e) => dragControls.start(e)}
                      role="button"
                      aria-label="drag"
                      className={cn(
                        "relative flex w-full h-full items-center justify-center cursor-grab active:cursor-grabbing",
                        isVertical ? "py-3 top-1" : "px-3 left-1"
                      )}
                    >
                      {isVertical ? (
                        <GripHorizontal className="text-paragraph" />
                      ) : (
                        <GripVertical className="text-paragraph" />
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ------------------------------------------------------------------
// --- MINIMAP COMPONENT (Enhanced) ---
// ------------------------------------------------------------------

interface MinimapProps {
  completion: number;
  headings: number[];
  isVertical: boolean;
  dragControls: any;
  isScrolling: boolean;
  isDragging: boolean;
  isDraggingRef: React.RefObject<boolean>;
  onTrackPointerEnter: () => void;
  onTrackPointerLeave: () => void;
  onTrackScrollStart: () => void;
  onTrackScrollEnd: () => void;
  isTrackScrollingRef: React.RefObject<boolean>;
}

function Minimap({
  completion,
  headings,
  isVertical,
  dragControls,
  isScrolling,
  isDragging,
  isDraggingRef,
  onTrackPointerEnter,
  onTrackPointerLeave,
  onTrackScrollStart,
  onTrackScrollEnd,
  isTrackScrollingRef,
}: MinimapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState(0);
  const [scrollDir, setScrollDir] = useState<"up" | "down">("down");
  const prevCompletion = useRef(completion);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      if (!containerRef.current) return;

      setContainerSize(
        isVertical ? containerRef.current.scrollHeight : containerRef.current.scrollWidth
      );
    };

    update();

    const ro = new ResizeObserver(() => {
      if (containerRef.current) update();
    });

    ro.observe(el);

    return () => {
      ro.disconnect();
    };
  }, [isVertical]);

  useEffect(() => {
    if (completion > prevCompletion.current) {
      setScrollDir("down");
    } else if (completion < prevCompletion.current) {
      setScrollDir("up");
    }
    prevCompletion.current = completion;
  }, [completion]);

  const LINE_COUNT = 50;
  const mousePos = useMotionValue(Infinity);

  const floatIndex = completion * (LINE_COUNT - 1);

  // Convert completion state to a MotionValue to drive animations without re-renders
  const completionMV = useMotionValue(completion);
  useEffect(() => {
    completionMV.set(completion);
  }, [completion, completionMV]);

  // --- 1:1 Heading Mapping ---
  // We generate a set of indices that strictly correspond to headings.
  const headingIndices = useMemo(() => {
    return new Set(headings.map((h) => Math.min(Math.floor(h * (LINE_COUNT - 1)), LINE_COUNT - 1)));
  }, [headings]);

  const lines = useMemo(() => {
    return Array.from({ length: LINE_COUNT }).map((_, i) => ({
      id: i,
      isHeading: headingIndices.has(i),
    }));
  }, [headingIndices]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // We calculate position relative to the container to ensure
    // wave animation works on all screen sizes/offsets
    const rect = e.currentTarget.getBoundingClientRect();
    if (isVertical) {
      mousePos.set(e.clientY - rect.top);
    } else {
      mousePos.set(e.clientX - rect.left);
    }
  };

  const handleMouseLeave = () => {
    mousePos.set(Infinity);
  };

  // Click on Track -> Scroll to that %
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let percent = 0;

    if (isVertical) {
      const y = e.clientY - rect.top;
      percent = y / rect.height;
    } else {
      const x = e.clientX - rect.left;
      percent = x / rect.width;
    }

    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    const targetY = percent * totalHeight;
    const startY = window.scrollY;
    const distance = targetY - startY;
    const duration = 1200;
    let startTime: number | null = null;

    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, startY + distance * easeInOutCubic(progress));
      if (progress < 1) requestAnimationFrame(step);
      else onTrackScrollEnd();
    };

    onTrackScrollStart();
    requestAnimationFrame(step);
  };

  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(5px)" }}
      animate={{ opacity: 1, transition: { delay: 0.15 }, filter: "blur(0px)" }}
      exit={{
        opacity: 0,
        filter: "blur(5px)",
      }}
      transition={{ duration: 0 }}
      dragSnapToOrigin
      className={cn(
        "relative flex items-center justify-between p-1",
        isVertical ? "flex-col h-full w-full" : "flex-row w-full h-full"
      )}
    >
      {/* THE MINIMAP TRACK (Interactive area) */}
      <div
        ref={containerRef}
        data-minimap-track="true"
        className={cn(
          "relative flex items-center justify-between grow cursor-pointer",
          isVertical ? "flex-col w-full px-1" : "flex-row h-full py-1",
          isDragging && "select-none pointer-events-none"
        )}
        onMouseMove={isDragging ? undefined : handleMouseMove}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        onMouseLeave={handleMouseLeave}
        onPointerEnter={isDragging ? undefined : onTrackPointerEnter}
        onPointerLeave={isDragging ? undefined : onTrackPointerLeave}
        onClick={isDragging ? undefined : handleTrackClick}
      >
        {lines.map((line) => (
          <MinimapLine
            key={line.id}
            index={line.id}
            totalLines={LINE_COUNT}
            isHeading={line.isHeading}
            isVertical={isVertical}
            mousePos={mousePos}
            scrollPos={completionMV}
            containerSize={containerSize}
            scrollDir={scrollDir}
            floatIndex={floatIndex}
          />
        ))}

        {/* Indicator Line */}
        <motion.div
          className="absolute bg-primary rounded-full pointer-events-none z-20 shadow-[0_0_10px_rgba(255,88,0,1.0)]"
          style={{
            ...(isVertical
              ? {
                  top: `${completion * 100}%`,
                  left: "56%",
                  width: "35px",
                  height: "2px",
                  x: "-50%",
                }
              : {
                  left: `${completion * 100}%`,
                  top: "55%",
                  height: "35px",
                  width: "2px",
                  y: "-50%",
                }),
          }}
          transition={{ type: "spring", bounce: 0, duration: 0.5 }}
        >
          {isVertical ? (
            <svg
              width="11"
              height="6"
              viewBox="0 0 9 6"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute -top-0.75 -left-3 -rotate-90"
            >
              <path d="M3.54688 6L0.515786 0.75L6.57796 0.75L3.54688 6Z" fill="#FF3400"></path>
            </svg>
          ) : (
            <svg
              width="11"
              height="6"
              viewBox="0 0 10 6"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute -top-2 -left-0.75"
            >
              <path d="M3.54688 6L0.515786 0.75L6.57796 0.75L3.54688 6Z" fill="#FF3400"></path>
            </svg>
          )}
        </motion.div>
      </div>

      <Separator
        orientation={isVertical ? "horizontal" : "vertical"}
        className={cn(
          "bg-border/60 shrink-0",
          isVertical ? "w-8 h-[1px] my-2" : "h-8 w-[1px] mx-2"
        )}
      />

      {/* Grip Handle */}
      <div
        className={cn(
          "flex items-center justify-center shrink-0 text-paragraph transition-colors select-none touch-none",
          isVertical ? "h-6 w-full" : "w-6 h-full"
        )}
      >
        {isVertical ? <GripHorizontal /> : <GripVertical />}
      </div>
    </motion.div>
  );
}

function MinimapLine({
  index,
  totalLines,
  isHeading,
  isVertical,
  mousePos,
  scrollPos,
  containerSize,
  scrollDir,
  floatIndex,
}: {
  index: number;
  totalLines: number;
  isHeading: boolean;
  isVertical: boolean;
  mousePos: MotionValue<number>;
  scrollPos: MotionValue<number>;
  containerSize: number;
  scrollDir: "up" | "down";
  floatIndex: number;
}) {
  const step = containerSize / (totalLines - 1);
  const myCenter = index * step;
  // Transform scroll percentage (0-1) to pixel position for distance calc
  const scrollPx = useTransform(scrollPos, (val) => val * containerSize);

  // Combine distances: trigger wave if EITHER Mouse OR Scroll Indicator is close
  const combinedDistance = useTransform([mousePos, scrollPx], (values) => {
    const [mPos, sPos] = values as number[];

    const mouseDist = isFinite(mPos) ? Math.abs(mPos - myCenter) : 2000;
    const scrollDist = Math.abs(sPos - myCenter);

    return Math.min(mouseDist, scrollDist);
  });

  const baseSize = isHeading ? 16 : 8;
  const maxSize = isHeading ? 28 : 24;

  // Wave radius is 80px
  const size = useTransform(combinedDistance, [0, 60], [maxSize, baseSize]);
  const sizeSpring = useSpring(size, { stiffness: 400, damping: 25 });

  let specialIndex: number;

  if (scrollDir === "down") {
    specialIndex = Math.floor(floatIndex);
  } else {
    specialIndex = Math.ceil(floatIndex);
  }

  specialIndex = Math.max(0, Math.min(totalLines - 1, specialIndex));

  const below = Math.floor(floatIndex);
  const isSpecial = index === below || index === below - 1;
  const isScrolledPast = index < below - 1;

  return (
    <motion.div
      className={cn(
        "rounded-full pointer-events-none transition-colors duration-200",
        isSpecial
          ? "bg-primary"
          : isScrolledPast
            ? "bg-primary"
            : isHeading
              ? "bg-black dark:bg-white z-10"
              : "bg-black/20 dark:bg-white/20"
      )}
      style={{
        ...(isVertical
          ? { height: "2px", width: sizeSpring }
          : { width: "2px", height: sizeSpring }),
      }}
    />
  );
}
// ------------------------------------------------------------------
// --- HELPERS (Tooltips & Search - Unchanged logic, condensed) ---
// ------------------------------------------------------------------

function VerticalTooltip({ items, hoveredIndex, prevHoveredIndex, ySpring, position }: any) {
  const itemHeight = 32;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      className={cn(
        "hidden sm:block pointer-events-none absolute overflow-hidden rounded-xl bg-[#FFEDE8] dark:bg-[#1C0100] text-primary shadow-lg z-50",
        position === "left" ? "left-full ml-3" : "right-full mr-3"
      )}
      style={{ top: ySpring, y: "-50%" }}
      animate={{ opacity: hoveredIndex !== null ? 1 : 0, height: itemHeight }}
      transition={{ opacity: { duration: 0.15 } }}
    >
      <motion.div
        className="flex flex-col items-center"
        initial={false}
        animate={{
          y: -(hoveredIndex !== null ? hoveredIndex : prevHoveredIndex) * itemHeight,
        }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
      >
        {items.map((label: any, i: number) => (
          <div
            key={i}
            className="inline-flex w-full h-8 items-center justify-center px-4 text-xs font-medium whitespace-nowrap"
            style={{ height: itemHeight }}
          >
            {label}
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

function HorizontalTooltip({ items, hoveredIndex, prevHoveredIndex, xSpring, position }: any) {
  const [textWidths, setTextWidths] = useState<number[]>([]);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    textRefs.current = textRefs.current.slice(0, items.length);
    const widths = textRefs.current.map((ref) => ref?.offsetWidth || 0);
    setTextWidths(widths);
  }, [items]);

  const activeIndex = hoveredIndex !== null ? hoveredIndex : prevHoveredIndex;
  const getCurrentWidth = () => textWidths[activeIndex] || 0;
  const getTextXOffset = () => {
    if (textWidths.length === 0) return 0;
    let offset = 0;
    for (let i = 0; i < activeIndex; i++) offset += textWidths[i];
    return -offset;
  };

  return (
    <>
      <div
        className="flex absolute opacity-0 pointer-events-none top-0 left-0 h-8 items-center whitespace-nowrap"
        aria-hidden="true"
      >
        {items.map((label: any, index: number) => (
          <div
            key={`measure-${index}`}
            ref={(el) => {
              textRefs.current[index] = el;
            }}
            className="px-4 text-xs font-medium"
          >
            {label}
          </div>
        ))}
      </div>
      {textWidths.length > 0 && (
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          className={cn(
            "hidden sm:block pointer-events-none absolute left-0 overflow-hidden rounded-xl bg-[#FFEDE8] dark:bg-[#1C0100] text-primary z-50",
            position === "bottom" ? "bottom-full mb-3" : "top-full mt-3"
          )}
          style={{ x: xSpring, translateX: "-50%" }}
          animate={{
            opacity: hoveredIndex !== null ? 1 : 0,
            width: getCurrentWidth(),
          }}
          transition={{
            opacity: { duration: 0.15 },
            width: { duration: 0.25, ease: "easeOut" },
          }}
        >
          <motion.div
            className="flex h-8 items-center whitespace-nowrap"
            animate={{ x: getTextXOffset() }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {items.map((label: any, index: number) => (
              <div
                key={`vis-${index}`}
                style={{ width: textWidths[index] }}
                className="flex h-8 items-center justify-center px-4 text-xs font-medium"
              >
                {label}
              </div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </>
  );
}

function DockIconWrapper({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "size-10 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer",
        "text-paragraph hover:text-primary! hover:bg-[#FFEDE8] dark:hover:bg-[#1C0100]",
        className
      )}
    >
      {children}
    </div>
  );
}

function DockItem({
  children,
  index,
  onHover,
}: {
  children: React.ReactNode;
  index: number;
  onHover: any;
}) {
  return (
    <div className="relative block" onMouseEnter={(e) => onHover(e, index)}>
      {children}
    </div>
  );
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const HighlightedText = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!highlight.trim()) {
    return <>{text}</>;
  }

  const safeHighlight = escapeRegExp(highlight);
  const regex = new RegExp(`(${safeHighlight})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span
            key={i}
            className="bg-yellow-200 dark:bg-yellow-900 text-foreground rounded-[2px] px-0.5"
          >
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
};

function extractTextFromHtml(html: string): string {
  if (typeof window === "undefined") return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  let textParts: string[] = [];

  // Normal visible text
  if (doc.body.textContent) {
    textParts.push(doc.body.textContent);
  }

  // Terminal blocks (including all package managers)
  const terminalBlocks = doc.querySelectorAll('[data-type="terminal-block"]');

  terminalBlocks.forEach((el) => {
    const visible = el.textContent ?? "";

    const npm = el.getAttribute("data-npm-content");
    const pnpm = el.getAttribute("data-pnpm-content");
    const yarn = el.getAttribute("data-yarn-content");

    textParts.push(visible);

    if (npm) textParts.push(npm);
    if (pnpm) textParts.push(pnpm);
    if (yarn) textParts.push(yarn);
  });

  // File code blocks
  const fileBlocks = doc.querySelectorAll('[data-type="file-code-block"] code');

  fileBlocks.forEach((code) => {
    textParts.push(code.textContent ?? "");
  });

  return textParts.join(" ").replace(/\s+/g, " ").trim();
}

interface DockSearchContentProps {
  initialTerm: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
  router: any;
}

function DockSearchContent({ initialTerm, inputRef, onClose, router }: DockSearchContentProps) {
  const posts = useQuery(api.posts.getPublishedPosts);

  const [displayTerm, setDisplayTerm] = useState(initialTerm);
  const [debouncedTerm, setDebouncedTerm] = useState(initialTerm);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [usingKeyboard, setUsingKeyboard] = useState(false);
  const [mouseMoved, setMouseMoved] = useState(false);

  useEffect(() => {
    if (displayTerm === debouncedTerm) return;
    if (displayTerm.length >= 1) {
      setIsDebouncing(true);
      const handler = setTimeout(() => {
        setDebouncedTerm(displayTerm);
        setIsDebouncing(false);
      }, 500);
      return () => clearTimeout(handler);
    } else {
      setDebouncedTerm(displayTerm);
      setIsDebouncing(false);
    }
  }, [displayTerm, debouncedTerm]);

  const results = useMemo(() => {
    if (debouncedTerm.length < 1 || !posts) return null;

    const lower = debouncedTerm.toLowerCase();

    return posts.filter((post: any) => {
      const fullText = extractTextFromHtml(post.body ?? "");
      const normalized = fullText.toLowerCase().replace(/\s+/g, " ");
      const query = lower.replace(/\s+/g, " ");

      normalized.includes(query);

      return (
        post.title.toLowerCase().includes(lower) ||
        (post.subtitle ?? "").toLowerCase().includes(lower) ||
        fullText.toLowerCase().includes(lower)
      );
    });
  }, [debouncedTerm, posts]);

  const getExcerpt = (text: string, term: string, maxLength = 160) => {
    if (!text) return "";

    const lowerText = text.toLowerCase();
    const lowerTerm = term.toLowerCase();

    const index = lowerText.indexOf(lowerTerm);

    if (index === -1) {
      return text.slice(0, maxLength) + (text.length > maxLength ? "…" : "");
    }

    const half = Math.floor(maxLength / 2);

    let start = index - half;
    let end = index + half;

    if (start < 0) {
      start = 0;
      end = maxLength;
    }

    if (end > text.length) {
      end = text.length;
      start = Math.max(0, end - maxLength);
    }

    const prefix = start > 0 ? "…" : "";
    const suffix = end < text.length ? "…" : "";

    return prefix + text.slice(start, end) + suffix;
  };

  useEffect(() => {
    if (activeIndex < 0) return;

    const el = itemRefs.current[activeIndex];
    if (el) {
      el.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
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
                if (e.key === "ArrowDown") {
                  return prev < results.length - 1 ? prev + 1 : 0;
                }
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
        ) : !results && displayTerm.length < 1 ? (
          <div className="flex flex-col items-center justify-center h-full text-paragraph gap-2 select-none">
            <BookText className="size-12 opacity-20" />
            <span className="text-sm font-medium">Type to search blog posts</span>
          </div>
        ) : results && results.length === 0 ? (
          <div className="flex items-center justify-center h-full px-6">
            <p className="text-paragraph text-sm truncate max-w-full text-center">
              No results found for "{debouncedTerm}"
            </p>
          </div>
        ) : (
          <div
            className="h-full overflow-y-auto p-2"
            onMouseMove={() => {
              if (usingKeyboard) {
                setUsingKeyboard(false);
                setMouseMoved(true);
              }
            }}
          >
            <div className="flex flex-col gap-1">
              {results?.map((post: any, index: number) => (
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
                      <HighlightedText text={post.title} highlight={debouncedTerm} />
                    </h4>

                    {post.subtitle && (
                      <p className="text-xs text-paragraph mt-0.5 truncate">
                        <HighlightedText text={post.subtitle} highlight={debouncedTerm} />
                      </p>
                    )}

                    {post.body && (
                      <p className="text-xs text-paragraph mt-1 truncate">
                        <HighlightedText
                          text={getExcerpt(extractTextFromHtml(post.body), debouncedTerm)}
                          highlight={debouncedTerm}
                        />
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
