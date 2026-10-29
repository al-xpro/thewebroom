"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// A password field with an eye button that shows or hides what was typed.
function PasswordInput({
  className,
  disabled,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="relative w-full">
      <Input
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={cn("pr-9", className)}
        {...props}
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-center size-8 text-paragraph hover:text-black dark:hover:text-white cursor-pointer disabled:cursor-not-allowed"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}

export { PasswordInput }
