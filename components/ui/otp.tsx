"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

const OTP_LENGTH = 6;

const generateRandomDigits = () => {
  return Array.from({ length: OTP_LENGTH }, () => Math.floor(Math.random() * 10).toString());
};

type ClerkOTPProps = {
  delay?: number;
  cardTitle?: string;
  cardDescription?: string;
  whileHover?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
};

function sanitizeOtp(value: string) {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export default function ClerkOTP(props: ClerkOTPProps) {
  const isInteractive =
    typeof props.onChange === "function" ||
    typeof props.onComplete === "function" ||
    props.value !== undefined;

  if (isInteractive) {
    return <InteractiveOTP {...props} />;
  }

  return <AnimatedOTP {...props} />;
}

function InteractiveOTP({
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
  className,
}: ClerkOTPProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalValue, setInternalValue] = useState("");
  const lastCompletedRef = useRef("");

  const currentValue = value !== undefined ? sanitizeOtp(value) : internalValue;

  useEffect(() => {
    if (!autoFocus || disabled) return;
    const timeoutId = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    return () => window.clearTimeout(timeoutId);
  }, [autoFocus, disabled]);

  useEffect(() => {
    if (value === undefined) return;
    setInternalValue(sanitizeOtp(value));
  }, [value]);

  const commitValue = (nextValue: string) => {
    const next = sanitizeOtp(nextValue);

    if (value === undefined) {
      setInternalValue(next);
    }

    onChange?.(next);

    if (next.length === OTP_LENGTH) {
      if (lastCompletedRef.current !== next) {
        lastCompletedRef.current = next;
        onComplete?.(next);
      }
      return;
    }

    lastCompletedRef.current = "";
  };

  return (
    <div
      className={cn(
        "relative flex w-full h-full max-w-[350px] flex-col rounded-md p-4",
        className
      )}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => {
        if (disabled) return;
        inputRef.current?.focus();
      }}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.focus();
        }
      }}
    >
      <input
        ref={inputRef}
        type="text"
        name="otp"
        id="otp"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={OTP_LENGTH}
        value={currentValue}
        disabled={disabled}
        onChange={(event) => {
          commitValue(event.target.value);
        }}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      />

      <div className="mb-4 flex w-full items-center justify-center gap-3">
        {Array.from({ length: OTP_LENGTH }, (_, index) => {
          const digit = currentValue[index] ?? "";
          const isActive = index === currentValue.length && currentValue.length < OTP_LENGTH;

          return (
            <div
              key={index}
              className={cn(
                "text-primary relative flex h-12 w-9 items-center justify-center rounded-md text-lg font-semibold bg-[#EDEDED] dark:bg-[#0A0A0A]",
                "shadow-[0_3px_10px_rgb(0,0,0,0.2)]",
                isActive && !disabled && "ring-2 ring-primary",
                disabled && "opacity-60"
              )}
            >
              {digit || ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnimatedOTP({
  delay = 3500,
  cardTitle = "Multifactor Authentication",
  cardDescription = "Each user's self-serve multifactor settings are enforced automatically during sign-in.",
  whileHover = false,
}: ClerkOTPProps) {
  const [animationKey, setAnimationKey] = useState(0);
  const delayTime = Math.max(delay, 3500);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setAnimationKey((prev) => prev + 1);
    }, delayTime);

    return () => window.clearInterval(interval);
  }, [delayTime]);

  return (
    <AnimatedOTPInput
      key={animationKey}
      cardTitle={cardTitle}
      cardDescription={cardDescription}
      whileHover={whileHover}
    />
  );
}

function AnimatedOTPInput({
  cardTitle,
  cardDescription,
  whileHover,
}: ClerkOTPProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [digits] = useState(() => generateRandomDigits());
  const [isCardHovered, setIsCardHovered] = useState(false);

  useEffect(() => {
    if (activeIndex > digits.length - 1) return;

    const shouldAnimate = !whileHover || (whileHover && isCardHovered);
    if (!shouldAnimate) return;

    const interval = window.setInterval(() => {
      setActiveIndex((prev) => prev + 1);
    }, 400);

    if (activeIndex === digits.length - 1) {
      const timeoutId = window.setTimeout(() => {
        setFadeOut(true);
      }, 450);
      return () => {
        window.clearInterval(interval);
        window.clearTimeout(timeoutId);
      };
    }

    return () => window.clearInterval(interval);
  }, [activeIndex, digits.length, whileHover, isCardHovered]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      onHoverStart={() => setIsCardHovered(true)}
      onHoverEnd={() => setIsCardHovered(false)}
      className={cn(
        "relative flex h-[14rem] w-full max-w-[350px] items-center justify-center rounded-md border bg-neutral-50 dark:bg-neutral-900",
        "shadow-[0_3px_10px_rgb(0,0,0,0.2)]"
      )}
    >
      <div className="absolute left-1/2 top-[25%] -translate-x-1/2">
        <div className="flex w-full items-center justify-center gap-3">
          {digits.map((digit, idx) => (
            <div
              key={idx}
              className={cn(
                "text-primary relative flex h-10 w-8 cursor-default items-center justify-center rounded-md bg-gradient-to-br from-neutral-100 to-neutral-50 dark:from-neutral-800 dark:to-neutral-800",
                "shadow-[0_3px_10px_rgb(0,0,0,0.2)]"
              )}
            >
              {(!whileHover || (whileHover && isCardHovered)) && (
                <motion.div
                  className="absolute inset-0 rounded-md border border-cyan-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{
                    duration: 0.5,
                    ease: "easeInOut",
                    delay: 2.25,
                  }}
                  style={{ boxShadow: "inset 0 0 12px rgba(34, 211, 238, 0.5)" }}
                />
              )}
              {activeIndex === idx && (!whileHover || (whileHover && isCardHovered)) && (
                <motion.div
                  key={idx}
                  className="absolute inset-0 rounded-md border border-cyan-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  style={{ boxShadow: "inset 0 0 12px rgba(34, 211, 238, 0.6)" }}
                >
                  <svg viewBox="0 0 20 20" className="absolute inset-0 h-full w-full" strokeWidth="0.4">
                    <path d="M 3 19 h 14" className="stroke-cyan-400 dark:stroke-cyan-500" />
                  </svg>
                </motion.div>
              )}
              <motion.span
                initial={{ opacity: 0 }}
                animate={{
                  opacity: whileHover
                    ? isCardHovered
                      ? fadeOut
                        ? 0
                        : 1
                      : 0
                    : fadeOut
                      ? 0
                      : 1,
                }}
                transition={{
                  duration: fadeOut ? 0.1 : 0.2,
                  ease: "easeInOut",
                  delay: fadeOut ? 0 : idx * 0.43,
                }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                {digit}
              </motion.span>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-4 left-0 w-full px-3">
        <h3 className="text-primary text-sm font-semibold">{cardTitle}</h3>
        <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">{cardDescription}</p>
      </div>
    </motion.div>
  );
}
