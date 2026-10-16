import * as React from "react";
import * as AlertPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";

export function AlertDialog(
  props: React.ComponentProps<typeof AlertPrimitive.Root>
) {
  return <AlertPrimitive.Root {...props} />;
}
export function AlertDialogAction(
  props: React.ComponentProps<typeof AlertPrimitive.Action>
) {
  return <AlertPrimitive.Action {...props} />;
}
export function AlertDialogCancel(
  props: React.ComponentProps<typeof AlertPrimitive.Cancel>
) {
  return <AlertPrimitive.Cancel {...props} />;
}
export function AlertDialogTitle(
  props: React.ComponentProps<typeof AlertPrimitive.Title>
) {
  return <AlertPrimitive.Title {...props} />;
}
export function AlertDialogDescription(
  props: React.ComponentProps<typeof AlertPrimitive.Description>
) {
  return <AlertPrimitive.Description {...props} />;
}
export function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof AlertPrimitive.Content>) {
  return (
    <AlertPrimitive.Portal>
      <AlertPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
      <AlertPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-background p-6 text-foreground shadow-lg",
          className
        )}
        {...props}
      />
    </AlertPrimitive.Portal>
  );
}
