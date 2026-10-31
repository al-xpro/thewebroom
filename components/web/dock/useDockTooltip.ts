import { useRef, useState, type MouseEvent, type RefObject } from "react";
import { useMotionValue, useSpring } from "framer-motion";

const SPRING = { stiffness: 350, damping: 30 };

// The label that follows the pointer along the dock: which item it shows, the one before
// (it slides from there), and where it sits.
export function useDockTooltip(dockRef: RefObject<HTMLDivElement | null>) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [prevHoveredIndex, setPrevHoveredIndex] = useState(0);
  // After the items change, the first label appears in place instead of sliding from where
  // the old dock's label was.
  const jumpRef = useRef(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const xSpring = useSpring(mouseX, SPRING);
  const ySpring = useSpring(mouseY, SPRING);

  const show = (e: MouseEvent<HTMLElement>, index: number, isVertical: boolean) => {
    if (!dockRef.current) return;
    const buttonRect = e.currentTarget.getBoundingClientRect();
    const dockRect = dockRef.current.getBoundingClientRect();

    if (isVertical) mouseY.set(buttonRect.top - dockRect.top + buttonRect.height / 2);
    else mouseX.set(buttonRect.left - dockRect.left + buttonRect.width / 2);

    if (jumpRef.current) {
      jumpRef.current = false;
      xSpring.jump(mouseX.get());
      ySpring.jump(mouseY.get());
    }

    if (hoveredIndex !== null && hoveredIndex !== index) setPrevHoveredIndex(hoveredIndex);
    setHoveredIndex(index);
  };

  const hide = () => {
    if (hoveredIndex !== null) setPrevHoveredIndex(hoveredIndex);
    setHoveredIndex(null);
  };

  // Forget the last label: the items are about to change.
  const reset = () => {
    setHoveredIndex(null);
    setPrevHoveredIndex(0);
    jumpRef.current = true;
  };

  return { hoveredIndex, prevHoveredIndex, xSpring, ySpring, show, hide, reset, clear: () => setHoveredIndex(null) };
}
