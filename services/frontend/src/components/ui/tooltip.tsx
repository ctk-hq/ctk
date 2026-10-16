import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
export function TooltipProvider(
  props: React.ComponentProps<typeof TooltipPrimitive.Provider>
) {
  return <TooltipPrimitive.Provider {...props} />;
}
export function Tooltip(
  props: React.ComponentProps<typeof TooltipPrimitive.Root>
) {
  return <TooltipPrimitive.Root {...props} />;
}
export function TooltipTrigger(
  props: React.ComponentProps<typeof TooltipPrimitive.Trigger>
) {
  return <TooltipPrimitive.Trigger {...props} />;
}
export function TooltipContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 max-w-xs rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground",
          className
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}
