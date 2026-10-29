import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "text-black dark:text-white resize-none max-h-50 placeholder:text-[#A0A0A0] dark:placeholder:text-[#666666] bg-transparent flex field-sizing-content min-h-12 w-full px-0 py-2 text-base font-light outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
