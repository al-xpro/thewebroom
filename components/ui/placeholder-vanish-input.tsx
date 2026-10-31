"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { Button } from "./button";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// A pixel of the typed text, scattered when it vanishes.
type Particle = { x: number; y: number; r: number; color: string };

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
  const newDataRef = useRef<Particle[]>([]);
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

    // Draw the text exactly where the input shows it (the canvas is drawn at 2x and shown
    // at half size), so the vanishing copy lines up with the typed text.
    const input = inputRef.current;
    const computedStyles = getComputedStyle(input);
    const fontSize = parseFloat(computedStyles.fontSize);
    ctx.font = `${computedStyles.fontWeight} ${fontSize * 2}px ${computedStyles.fontFamily}`;
    ctx.fillStyle = computedStyles.color;
    ctx.textBaseline = "middle";
    const x = input.offsetLeft + parseFloat(computedStyles.paddingLeft);
    const y = input.offsetTop + input.offsetHeight / 2;
    ctx.fillText(value, x * 2, y * 2);

    const imageData = ctx.getImageData(0, 0, 800, 800);
    const pixelData = imageData.data;
    const newData: { x: number; y: number; color: number[] }[] = [];

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
        const newArr: Particle[] = [];
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
        "input-underline relative w-full h-11 overflow-hidden flex items-center",
        className
      )}
    >
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute pointer-events-none scale-50 top-0 left-0 origin-top-left",
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
          "w-full h-full bg-transparent pl-0 pr-12 text-base font-light text-black dark:text-white outline-none truncate",
          animating && "text-transparent dark:text-transparent"
        )}
      />

      {/* Static placeholder */}
      <div className="absolute left-0 inset-y-0 flex items-center pointer-events-none">
        {!value && (
          <p className="text-base font-light text-[#A0A0A0] dark:text-[#666666] truncate">
            {placeholder}
          </p>
        )}
      </div>
      {/* Enter in the field submits; Tab doesn't stop here, so the field's ring is the only one. */}
      <Button
        type="submit"
        tabIndex={-1}
        aria-label="Subscribe"
        disabled={submitted}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-20"
        variant="ghost"
        size="icon-sm"
      >
        <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}
