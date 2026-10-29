"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { Button } from "./button";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function PlaceholdersAndVanishInput({
  placeholder,
  className,
  onSubmit,
  id
}: {
  placeholder: string;
  className?: string;
  onSubmit?: (email: string) => void;
  id?: string
}) {
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startAnimation = () => {
    intervalRef.current = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholder.length);
    }, 3000);
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState !== "visible" && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    } else if (document.visibilityState === "visible") {
      startAnimation();
    }
  };

  useEffect(() => {
    startAnimation();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [placeholder]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const newDataRef = useRef<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [animating, setAnimating] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const draw = useCallback(() => {
    if (!inputRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 800;
    ctx.clearRect(0, 0, 800, 800);

    const computedStyles = getComputedStyle(inputRef.current);
    const fontSize = parseFloat(computedStyles.fontSize);
    ctx.font = `${fontSize * 2}px ${computedStyles.fontFamily}`;

    // Draw with the actual text color instead of always white
    ctx.fillStyle = computedStyles.color;
    ctx.fillText(value, 16, 40);

    const imageData = ctx.getImageData(0, 0, 800, 800);
    const pixelData = imageData.data;
    const newData: any[] = [];

    for (let t = 0; t < 800; t++) {
      const i = 4 * t * 800;
      for (let n = 0; n < 800; n++) {
        const e = i + 4 * n;
        if (pixelData[e + 3] > 0) {
          newData.push({
            x: n,
            y: t,
            color: [pixelData[e], pixelData[e + 1], pixelData[e + 2], pixelData[e + 3]],
          });
        }
      }
    }

    newDataRef.current = newData.map(({ x, y, color }) => ({
      x,
      y,
      r: 1,
      color: `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`,
    }));
  }, [value]);

  useEffect(() => {
    draw();
  }, [value, draw]);

  const animate = (start: number) => {
    const animateFrame = (pos: number = 0) => {
      requestAnimationFrame(() => {
        const newArr = [];
        for (let i = 0; i < newDataRef.current.length; i++) {
          const current = newDataRef.current[i];
          if (current.x < pos) {
            newArr.push(current);
          } else {
            if (current.r <= 0) {
              current.r = 0;
              continue;
            }
            current.x += Math.random() > 0.5 ? 1 : -1;
            current.y += Math.random() > 0.5 ? 1 : -1;
            current.r -= 0.05 * Math.random();
            newArr.push(current);
          }
        }
        newDataRef.current = newArr;
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) {
          ctx.clearRect(pos, 0, 800, 800);
          newDataRef.current.forEach((t) => {
            const { x: n, y: i, r: s, color } = t;
            if (n > pos) {
              ctx.beginPath();
              ctx.rect(n, i, s, s);
              ctx.fillStyle = color;
              ctx.strokeStyle = color;
              ctx.stroke();
            }
          });
        }
        if (newDataRef.current.length > 0) {
          animateFrame(pos - 8);
        } else {
          setValue("");
          setAnimating(false);
        }
      });
    };
    animateFrame(start);
  };

  const vanishAndSubmit = () => {
    setAnimating(true);
    draw();
    const maxX = newDataRef.current.reduce(
      (prev, current) => (current.x > prev ? current.x : prev),
      0
    );
    if (maxX === 0) {
      setValue("");
      setAnimating(false);
      return;
    }
    animate(maxX);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!inputRef.current?.checkValidity()) return;
    e.preventDefault();
    if (animating || submitted) return;
    vanishAndSubmit();
    setSubmitted(true);
    onSubmit?.(value);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "relative w-full h-12 rounded-xl overflow-hidden bg-white dark:bg-black flex items-center focus-within:ring-3 focus-within:ring-[#ffc7bb] dark:focus-within:ring-[#660900] border border-transparent focus-within:border-[#FF3400] focus-within:outline-none",
        className
      )}
    >
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute pointer-events-none scale-50 top-[20%] left-2 origin-top-left",
          animating ? "opacity-100" : "opacity-0"
        )}
      />


      <input
        ref={inputRef}
        value={value}
        type="email"
        name="email"
        id={id}
        autoComplete="email"
        required
        pattern={EMAIL_REGEX.source}
        onChange={(e) => !animating && setValue(e.target.value)}
        className={cn(
          "w-full h-full bg-transparent pl-4 pr-14 text-sm sm:text-base text-black dark:text-white outline-none truncate",
          animating && "text-transparent dark:text-transparent"
        )}
      />

      {/* Static placeholder */}
      <div className="absolute left-4 inset-y-0 flex items-center pointer-events-none">
        {!value && (
          <p className="text-sm sm:text-base text-neutral-400 dark:text-zinc-500 truncate">
            {placeholder}
          </p>
        )}
      </div>
      {/* Enter in the field submits; Tab doesn't stop here, so the field's ring is the only one. */}
      <Button
        type="submit"
        tabIndex={-1}
        aria-label="Subscribe"
        className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 z-20 cursor-pointer",
          "flex items-center gap-2 rounded-full px-3 sm:px-4 py-1.5 text-sm font-medium transition",
          submitted ? "bg-transparent! border-transparent! cursor-text" : "default"
        )}
        variant="default"
      >
        {submitted ? "Thanks" : <ArrowRight className="size-4" />}
      </Button>
    </form>
  );
}
