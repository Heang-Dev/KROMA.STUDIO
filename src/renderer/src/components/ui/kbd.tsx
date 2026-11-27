import { isMac } from "@/lib/platform"
import { cn } from "@/lib/utils"

// Mac key symbols become the names Windows and Linux use.
const KEY_NAMES: Record<string, string> = { "⌘": "Ctrl", "⇧": "Shift", "⌥": "Alt" }

function Kbd({ className, children, ...props }: React.ComponentProps<"kbd">) {
  if (!isMac && typeof children === "string" && KEY_NAMES[children]) children = KEY_NAMES[children]
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm bg-muted px-1 font-sans text-xs font-medium text-muted-foreground select-none",
        "[&_svg:not([class*='size-'])]:size-3",
        "[[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10",
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  )
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn("inline-flex items-center gap-1", className)}
      {...props}
    />
  )
}

export { Kbd, KbdGroup }
