import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "input-underline file:text-[#666666] dark:file:text-[#A0A0A0] placeholder:text-[#A0A0A0] dark:placeholder:text-[#666666] selection:bg-primary selection:text-primary-foreground text-black dark:text-white h-9 w-full min-w-0 px-0 py-1 text-base font-light transition-[background-image] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 truncate",
        className
      )}
      {...props}
    />
  )
}

export { Input }
