"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState, type MouseEvent } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { DockItems } from "./dock/DockItems";
import { GROUP_RESIZE_S } from "./dock/DockItem";
import { DockSearch } from "./dock/DockSearch";
import { HorizontalTooltip, VerticalTooltip } from "./dock/DockTooltips";
import { Minimap } from "./dock/Minimap";
import { dockPage, useIsClient, useIsScrolling, usePostSurface } from "./dock/useDockPage";
import { useDockDrag } from "./dock/useDockDrag";
import { useDockGroups } from "./dock/useDockGroups";
import { useDockTooltip } from "./dock/useDockTooltip";
import { useReadingProgress } from "./dock/useReadingProgress";

const CONTAINER_POSITIONS = {
  bottom: "items-end justify-center",
  top: "items-start justify-center",
  left: "items-center justify-start",
  right: "items-center justify-end",
} as const;

// Keeps the scroll where it is: blurring the search box made Safari jump.
function blurKeepingScroll() {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  const scrollY = window.scrollY;
  requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "instant" }));
}

// The floating dock: navigation, search (⌘K), and on posts a minimap of the page. It can
// be dragged to any side of the screen.
export function DockNavigation() {
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.auth.getCurrentUser, isAuthenticated ? undefined : "skip");
  const unreadNotifications = useQuery(api.notifications.unreadCount, isAuthenticated ? {} : "skip") ?? 0;
  const pathname = usePathname();
  const { isEditorRoute, isPostPage } = dockPage(pathname);
  const isClient = useIsClient();
  const postExists = usePostSurface(pathname, isPostPage, isEditorRoute);
  const showMinimap = isPostPage && postExists;
  const isScrolling = useIsScrolling(isPostPage);
  const { completion, headings } = useReadingProgress();

  const dockRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [allowDrag, setAllowDrag] = useState(true);

  const tooltip = useDockTooltip(dockRef);

  // Labels hide while the dock moves or changes shape, then come back.
  const [isLayoutAnimating, setIsLayoutAnimating] = useState(false);
  const pauseTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pauseLabels = (ms: number, then?: () => void) => {
    setIsLayoutAnimating(true);
    tooltip.clear();
    clearTimeout(pauseTimer.current);
    pauseTimer.current = setTimeout(() => {
      setIsLayoutAnimating(false);
      then?.();
    }, ms);
  };
  useEffect(() => () => clearTimeout(pauseTimer.current), []);

  const setSearching = (next: boolean) => {
    setIsSearching(next);
    pauseLabels(350, next ? () => inputRef.current?.focus() : undefined);
  };

  const drag = useDockDrag({
    showMinimap,
    isSearching,
    isScrolling,
    onDrag: tooltip.clear,
    onMove: () => pauseLabels(200),
  });
  const { isVertical, isDragging } = drag;

  const { group, openGroup, entries, isActive, isSwitchingGroup } = useDockGroups({
    pathname,
    isAuthenticated,
    unreadNotifications,
    onSearch: () => setSearching(true),
    onSwitch: tooltip.reset,
  });

  // The dock's size follows what it shows, but only once the previous content has left:
  // resizing while the minimap is still animating out (AnimatePresence "wait") stretched
  // the dock across the viewport, e.g. when leaving a post with the browser's back button.
  const targetMode = isSearching ? "search" : showMinimap ? "minimap" : "dock";
  const [frameMode, setFrameMode] = useState(targetMode);
  // The frame leaves "dock" as soon as the dock does; it comes back to "dock" only when the
  // dock's items mount (DockItems' onReady).
  if (targetMode !== "dock" && frameMode !== targetMode) setFrameMode(targetMode);
  // Entering the minimap resizes at once (waiting showed it squeezed while the dock grew);
  // leaving it waits for the dock's items to arrive.
  const frame = isSearching ? "search" : targetMode === "minimap" ? "minimap" : frameMode;

  // A new page resets the scroll while the dock's layout is being measured, and the dock
  // read that as a move: it rose from below. Its layout animation pauses for the two frames
  // a page change takes to settle.
  const [layoutPath, setLayoutPath] = useState(pathname);
  const [routeSettling, setRouteSettling] = useState(false);
  if (layoutPath !== pathname) {
    setLayoutPath(pathname);
    setRouteSettling(true);
  }
  useEffect(() => {
    if (!routeSettling) return;
    let frameId = requestAnimationFrame(() => {
      frameId = requestAnimationFrame(() => setRouteSettling(false));
    });
    return () => cancelAnimationFrame(frameId);
  }, [routeSettling]);

  // ⌘K opens and closes the search; Escape closes it.
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      if (isPostPage && isScrolling) return;
      if (isSearching) {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        setSearching(false);
      } else {
        setSearching(true);
        const scrollY = window.scrollY;
        requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "instant" }));
      }
    }
    if (e.key === "Escape" && isSearching) {
      e.preventDefault();
      setSearching(false);
      blurKeepingScroll();
    }
  });
  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const { measureRef } = drag;
  const setDockRef = useCallback(
    (el: HTMLDivElement | null) => {
      dockRef.current = el;
      return measureRef(el);
    },
    [measureRef]
  );

  const onItemHover = (e: MouseEvent<HTMLElement>, index: number) => {
    if (isDragging || isSearching || isLayoutAnimating || isSwitchingGroup) return;
    tooltip.show(e, index, isVertical);
  };

  const dockLabels = [
    ...entries.map((entry) => ({ key: entry.key, label: entry.label })),
    ...(group ? [] : [{ key: "theme", label: "Theme" }]),
  ];
  const showTooltips = !isSearching && !isDragging && !isLayoutAnimating && !isSwitchingGroup && !showMinimap;

  if (!isClient) return null;

  return (
    <>
      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSearching(false)}
            role="button"
            aria-label="close search"
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* Posts wait for their article so the dock doesn't flash before the minimap; the
            editor keeps the dock while it loads, so it never disappears on /create. */}
        {(!isPostPage || postExists || isEditorRoute) && (
          // layoutRoot: the dock sits in a fixed container, so its layout animations must not
          // include the page's scroll. Without it, leaving a scrolled post (minimap) made the
          // dock rise from far below.
          <motion.div
            layoutRoot
            className={cn(
              "fixed inset-0 z-50 flex px-3 py-16 sm:p-16 pointer-events-none transition-all duration-500 ease-in-out min-w-[320px]",
              isSearching ? "items-center justify-center" : CONTAINER_POSITIONS[drag.position]
            )}
          >
            <motion.div
              ref={setDockRef}
              // Fluid changes between dock, minimap and search sizes; off while a new page
              // settles (see routeSettling).
              layout={!routeSettling}
              // A group switch resizes on a short, steady curve, so the new items can wait for
              // it to end; dragging to another side keeps its own motion.
              transition={isSwitchingGroup ? { layout: { duration: GROUP_RESIZE_S, ease: [0.4, 0, 0.2, 1] } } : undefined}
              drag={!isSearching && allowDrag && !(showMinimap && isScrolling)}
              dragControls={drag.dragControls}
              dragMomentum={false}
              dragElastic={1.0}
              onDragStart={drag.handleDragStart}
              {...drag.minimapPointer}
              onDragEnd={drag.handleDragEnd}
              dragConstraints={drag.dragConstraints}
              dragSnapToOrigin
              dragTransition={{ bounceStiffness: 600, bounceDamping: 100 }}
              onMouseLeave={tooltip.hide}
              style={showMinimap ? { y: drag.dragY } : undefined}
              className={cn(
                "relative flex gap-1 rounded-[28px] border border-black/5 dark:border-white/10 bg-white/90 dark:bg-black/90 shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-colors pointer-events-auto cursor-grab active:cursor-grabbing",
                frame === "search"
                  ? "w-[550px] h-[450px] max-w-[90vw] max-h-[80vh] min-w-[300px] flex-col p-0 overflow-hidden cursor-default active:cursor-default truncate"
                  : frame === "minimap"
                    ? isVertical
                      ? "w-14 min-h-[260px] max-h-[400px] h-full flex-col py-3 items-center overflow-hidden touch-none"
                      : "w-[400px] max-w-full h-14 flex-row px-3 items-center overflow-hidden touch-none"
                    : isVertical
                      ? "w-16 h-auto flex-col p-2"
                      : "w-auto h-16 flex-row scale-92 sm:scale-100 p-2"
              )}
            >
              {showTooltips &&
                (isVertical ? (
                  <VerticalTooltip
                    items={dockLabels}
                    hoveredIndex={tooltip.hoveredIndex}
                    prevHoveredIndex={tooltip.prevHoveredIndex}
                    ySpring={tooltip.ySpring}
                    position={drag.position}
                  />
                ) : (
                  <HorizontalTooltip
                    items={dockLabels}
                    hoveredIndex={tooltip.hoveredIndex}
                    prevHoveredIndex={tooltip.prevHoveredIndex}
                    xSpring={tooltip.xSpring}
                    position={drag.position}
                  />
                ))}

              <AnimatePresence mode="wait">
                {isSearching ? (
                  <motion.div
                    key="search"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0 } }}
                    className="flex flex-col w-full h-full"
                  >
                    <DockSearch inputRef={inputRef} onClose={() => setSearching(false)} />
                  </motion.div>
                ) : showMinimap ? (
                  <Minimap
                    key="minimap"
                    completion={completion}
                    headings={headings}
                    isVertical={isVertical}
                    isDragging={isDragging}
                    onTrackPointerEnter={() => setAllowDrag(false)}
                    onTrackPointerLeave={() => setAllowDrag(true)}
                    onTrackScrollStart={() => drag.setTrackScrolling(true)}
                    onTrackScrollEnd={() => drag.setTrackScrolling(false)}
                  />
                ) : (
                  <DockItems
                    key="dock"
                    entries={entries}
                    group={group}
                    isActive={isActive}
                    isVertical={isVertical}
                    isDragging={isDragging}
                    avatarUrl={currentUser?.avatarUrl}
                    onHover={onItemHover}
                    onOpenGroup={openGroup}
                    onReady={() => setFrameMode("dock")}
                    onGripDown={(e) => drag.dragControls.start(e)}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
