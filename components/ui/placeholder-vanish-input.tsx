"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "./button";

const EMAIL_REGEX =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function PlaceholdersAndVanishInput({
  placeholder,
  className,
}: {
  placeholder: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const newDataRef = useRef<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const [value, setValue] = useState("");
  const [animating, setAnimating] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /* -------------------- DRAW (UNCHANGED) -------------------- */
  const draw = useCallback(() => {
    if (!inputRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 800;
    ctx.clearRect(0, 0, 800, 800);

    const styles = getComputedStyle(inputRef.current);
    const fontSize = parseFloat(styles.fontSize);

    ctx.font = `${fontSize * 2}px ${styles.fontFamily}`;
    ctx.fillStyle = "#FFF";
    ctx.fillText(value, 16, 40);

    const imageData = ctx.getImageData(0, 0, 800, 800);
    const pixelData = imageData.data;
    const particles: any[] = [];

    for (let y = 0; y < 800; y++) {
      for (let x = 0; x < 800; x++) {
        const i = (y * 800 + x) * 4;
        if (pixelData[i] !== 0) {
          particles.push({ x, y, r: 1 });
        }
      }
    }

    newDataRef.current = particles;
  }, [value]);

  useEffect(() => {
    draw();
  }, [value, draw]);

  /* -------------------- ANIMATE (UNCHANGED) -------------------- */
  const animate = (start: number) => {
    const frame = (pos: number) => {
      requestAnimationFrame(() => {
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(pos, 0, 800, 800);

        newDataRef.current = newDataRef.current.filter((p) => {
          if (p.x < pos) return true;
          p.x += Math.random() > 0.5 ? 1 : -1;
          p.y += Math.random() > 0.5 ? 1 : -1;
          p.r -= 0.05;
          if (p.r <= 0) return false;
          ctx.fillRect(p.x, p.y, p.r, p.r);
          return true;
        });

        if (newDataRef.current.length) {
          frame(pos - 8);
        } else {
          setAnimating(false);
          setValue("");
          setSubmitted(true);
        }
      });
    };

    frame(start);
  };

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    // Let the browser validate first
    if (!inputRef.current?.checkValidity()) return;

    e.preventDefault();
    if (animating || submitted) return;

    setAnimating(true);
    draw();

    const maxX = newDataRef.current.reduce(
      (m, p) => (p.x > m ? p.x : m),
      0
    );
    animate(maxX);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "relative w-full h-12 rounded-xl overflow-hidden bg-white dark:bg-black flex truncate items-center focus-within:ring-3 focus-within:ring-[#FFBBA2] dark:focus-within:ring-[#742C0A] border border-transparent focus-within:border-[#FF5800] focus-within:outline-none",
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
        autoComplete="email"
        required
        placeholder={placeholder}
        pattern={EMAIL_REGEX.source}
        onChange={(e) => !animating && setValue(e.target.value)}
        className={cn(
          "w-full h-full bg-transparent pl-4 pr-32 text-sm sm:text-base text-black dark:text-white outline-none truncate",
          animating && "text-transparent"
        )}
      />

      <Button
        type="submit"
        className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 z-20 cursor-pointer",
          "flex items-center gap-2 rounded-full px-3 sm:px-4 py-1.5 text-sm font-medium transition",
          submitted
            ? "bg-transparent! border-transparent! cursor-text"
            : "default",
        )}
      >
        {submitted ? (
          "Thank you!"
        ) : (
          <>
            Subscribe
            <Send className="w-4 h-4" />
          </>
        )}
      </Button>
    </form>
  );
}