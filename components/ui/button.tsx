import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center cursor-pointer gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary border border-transparent text-primary-foreground bg-[#FFEDE8] dark:bg-[#1C0100] text-primary border-primary enabled:hover:bg-primary/30 dark:enabled:hover:bg-primary/20",
        destructive:
          "text-destructive bg-destructive text-white dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 enabled:hover:bg-[#AE2A2E] bg-[#DA2E34] dark:enabled:hover:bg-[#FF6166] dark:bg-[#D93036]",
        outline:
          "border bg-transparent shadow-xs hover:bg-accent hover:text-primary dark:focus-visible:border-primary dark:border-input hover:bg-[#FFEDE8] dark:hover:bg-[#1C0100]",
        secondary:
          "text-black dark:text-white border border-[#EAEAEA] dark:border-[#282828] bg-white dark:bg-black hover:bg-[#d9d9d9] dark:hover:bg-[#1E1E1E] disabled:hover:bg-white dark:disabled:hover:bg-black",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
