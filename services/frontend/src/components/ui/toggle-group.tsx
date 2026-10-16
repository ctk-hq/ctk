import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle-group";
import { cn } from "@/lib/utils";

export function ToggleGroup({
  className,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root>) {
  return (
    <TogglePrimitive.Root
      className={cn(
        "flex flex-wrap items-center justify-start gap-1",
        className
      )}
      {...props}
    />
  );
}
export function ToggleGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Item>) {
  return (
    <TogglePrimitive.Item
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-md border border-input bg-transparent px-3 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground data-[state=on]:hover:bg-accent/80",
        className
      )}
      {...props}
    />
  );
}
