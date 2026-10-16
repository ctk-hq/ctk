import { Pencil, Trash2 } from "lucide-react";
import { CallbackFunction } from "@/types";
import { Button } from "@/components/ui/button";
export function Popover({
  onEditClick,
  onDeleteClick
}: {
  onEditClick: CallbackFunction;
  onDeleteClick: CallbackFunction;
}) {
  return (
    <div
      data-node-actions
      className="absolute -top-10 right-0 z-50 flex items-center gap-1 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        aria-label="Edit node"
        title="Edit node"
        onClick={() => onEditClick()}
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 text-destructive"
        aria-label="Delete node"
        title="Delete node"
        onClick={() => onDeleteClick()}
      >
        <Trash2 />
      </Button>
    </div>
  );
}
