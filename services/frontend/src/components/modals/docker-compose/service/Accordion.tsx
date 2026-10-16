import { type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useAccordionState } from "../../../../hooks";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
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
    <Collapsible open={open} onOpenChange={toggle} className="space-y-3 pt-3">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="h-auto w-full justify-start px-2">
          {open ? (
            <ChevronDown className="size-4" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-4" aria-hidden="true" />
          )}
          <span>{title}</span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}
