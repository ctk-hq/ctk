import { type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useAccordionState } from "../../../../hooks";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
export interface IAccordionProps {
  id: string;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}
export default function Accordion({
  id,
  title,
  defaultOpen = false,
  children
}: IAccordionProps) {
  const { open, toggle } = useAccordionState(id, defaultOpen);
  return (
    <Collapsible
      open={open}
      onOpenChange={toggle}
      className="space-y-3 border-t pt-3"
    >
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="h-auto w-full justify-between px-2">
          <span>{title}</span>
          <ChevronDown
            className={cn("size-4 transition-transform", open && "rotate-180")}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}
