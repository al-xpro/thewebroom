"use client";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef } from "react";

// This component now acts as a logical wrapper (like a Link)
export const AnimatedThemeToggler = ({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Sync the theme on mount so a refresh keeps it.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", localStorage.getItem("theme") === "dark");
  }, []);

  const toggleTheme = useCallback(async () => {
    const newTheme = !document.documentElement.classList.contains("dark");
    
    // 1. Prepare View Transition
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const endRadius = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y)
    );

    // 2. Logic Update Function
    const updateTheme = () => {
      document.documentElement.classList.toggle("dark", newTheme);
      localStorage.setItem("theme", newTheme ? "dark" : "light");
    };

    // 3. Fallback for browsers without View Transitions
    if (!document.startViewTransition) {
      updateTheme();
      return;
    }

    // 4. Animate
    const transition = document.startViewTransition(() => {
      updateTheme();
    });

    await transition.ready;

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 500,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      }
    );
  }, []);

  return (
    <button
      ref={buttonRef}
      onClick={toggleTheme}
      name="theme"
      className={cn("bg-transparent border-none p-0 cursor-pointer outline-none focus-visible:ring-2 rounded-xs focus-visible:ring-primary/50", className)}
      {...props} 
    >
      {children}
    </button>
  );
};