import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useDragControls, useMotionValue, type PanInfo } from "framer-motion";
import type { DockPosition } from "./types";

const EDGE_PADDING = 24;

const lockScroll = (locked: boolean) => {
  document.documentElement.style.overflow = locked ? "hidden" : "";
  document.body.style.overflow = locked ? "hidden" : "";
};

// The side of the screen a point falls in, split along the diagonals.
function sideAt(x: number, y: number): DockPosition {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const slope = h / w;
  if (y < x * slope && y < h - x * slope) return "top";
  if (y > x * slope && y > h - x * slope) return "bottom";
  if (y > x * slope && y < h - x * slope) return "left";
  return "right";
}

function pointOf(event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
  if (event instanceof MouseEvent || event instanceof PointerEvent) return { x: event.clientX, y: event.clientY };
  if (event instanceof TouchEvent && event.changedTouches.length > 0) {
    return { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
  }
  return info.point;
}

interface Options {
  showMinimap: boolean;
  isSearching: boolean;
  // While the page scrolls (or the minimap scrolls it), a press on the minimap isn't a drag.
  isScrolling: boolean;
  // A drag started or ended: the label hides.
  onDrag: () => void;
  // The dock moved to another side.
  onMove: () => void;
}

// Dragging the dock to any side of the screen: it snaps to the side you let go on. Only
// the grip starts a drag (and, on posts, the minimap's frame); the page can't scroll while
// it moves.
export function useDockDrag({ showMinimap, isSearching, isScrolling, onDrag, onMove }: Options) {
  const [position, setPosition] = useState<DockPosition>("bottom");
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const [dockSize, setDockSize] = useState({ width: 0, height: 0 });
  const isDraggingRef = useRef(false);
  const isTrackScrollingRef = useRef(false);
  const dragControls = useDragControls();
  const dragY = useMotionValue(0);

  const isVertical = (position === "left" || position === "right") && !isSearching;

  const handleDragStart = () => {
    isDraggingRef.current = true;
    setIsDragging(true);
    onDrag();
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    isDraggingRef.current = false;
    setIsDragging(false);
    setIsSnapping(true);
    onDrag();

    const { x, y } = pointOf(event, info);
    const side = sideAt(x, y);
    if (side !== position) {
      setPosition(side);
      onMove();
    }
    setTimeout(() => setIsSnapping(false), 600);
  };

  // The minimap's frame drags too: a press there starts one unless the page is scrolling.
  const minimapPointer = {
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!showMinimap || isScrolling || isTrackScrollingRef.current) return;
      isDraggingRef.current = true;
      lockScroll(true);
      dragControls.start(e);
    },
    // A tap without a drag unlocks the scroll at once.
    onPointerUp: () => {
      if (isDragging) return;
      isDraggingRef.current = false;
      lockScroll(false);
    },
    onPointerCancel: () => {
      if (isDragging) return;
      isDraggingRef.current = false;
      lockScroll(false);
    },
  };

  useEffect(() => {
    if (!showMinimap) return;
    const prevent = (e: TouchEvent) => {
      if (isDraggingRef.current) e.preventDefault();
    };
    document.body.addEventListener("touchmove", prevent, { passive: false });
    return () => document.body.removeEventListener("touchmove", prevent);
  }, [showMinimap]);

  useEffect(() => {
    lockScroll(isDragging || isSnapping);
    return () => lockScroll(false);
  }, [isDragging, isSnapping]);

  // A vertical minimap moves up and down its side, but stays on screen.
  useEffect(() => {
    if (!showMinimap || !isVertical) return;
    return dragY.on("change", (y) => {
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const maxY = vh / 2 - dockSize.height / 2 - EDGE_PADDING;
      if (y < -maxY) dragY.set(-maxY);
      if (y > maxY) dragY.set(maxY);
    });
  }, [showMinimap, isVertical, dragY, dockSize.height]);

  // Follows the dock's size, for the drag bounds; the dock remounts between pages.
  const measureRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const update = () =>
      setDockSize((prev) =>
        prev.width === el.offsetWidth && prev.height === el.offsetHeight
          ? prev
          : { width: el.offsetWidth, height: el.offsetHeight }
      );
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  const dragConstraints = useMemo(() => {
    if (typeof window === "undefined") return { top: 0, bottom: 0, left: 0, right: 0 };
    const vw = window.visualViewport?.width ?? window.innerWidth;
    const vh = window.visualViewport?.height ?? window.innerHeight;
    const maxX = (vw - dockSize.width) / 2 - EDGE_PADDING;
    const maxY = (vh - dockSize.height) / 2 - EDGE_PADDING;
    return { top: -maxY, bottom: maxY, left: -maxX, right: maxX };
  }, [dockSize]);

  return {
    position,
    isVertical,
    isDragging,
    dragControls,
    dragY,
    dragConstraints,
    measureRef,
    // The minimap is scrolling the page (a click on its track).
    setTrackScrolling: (active: boolean) => {
      isTrackScrollingRef.current = active;
    },
    handleDragStart,
    handleDragEnd,
    minimapPointer,
  };
}
