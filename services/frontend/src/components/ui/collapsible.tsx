import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
export function Collapsible(
  props: React.ComponentProps<typeof CollapsiblePrimitive.Root>
) {
  return <CollapsiblePrimitive.Root {...props} />;
}
export function CollapsibleTrigger(
  props: React.ComponentProps<typeof CollapsiblePrimitive.Trigger>
) {
  return <CollapsiblePrimitive.Trigger {...props} />;
}
export function CollapsibleContent(
  props: React.ComponentProps<typeof CollapsiblePrimitive.Content>
) {
  return <CollapsiblePrimitive.Content {...props} />;
}
