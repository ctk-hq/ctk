import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
export interface INetworkListProps {
  networks: Record<string, any>;
  selectedUuid: string;
  onEdit: (networkUuid: string) => void;
  onNew: () => void;
  onRemove: (networkUuid: string) => void;
}
export default function NetworkList({
  onNew,
  onRemove,
  onEdit,
  networks,
  selectedUuid
}: INetworkListProps) {
  return (
    <div className="flex shrink-0 flex-col justify-between gap-3 border-b p-3 sm:w-44 sm:border-b-0 sm:border-r">
      <div className="flex flex-col gap-1">
        {Object.keys(networks).map((uuid) => {
          const name = networks[uuid].canvasConfig.node_name;
          return (
            <div
              key={uuid}
              className={cn(
                "flex items-center gap-1 rounded-md",
                uuid === selectedUuid && "bg-accent"
              )}
            >
              <Button
                variant="ghost"
                className="min-w-0 flex-1 justify-start"
                aria-pressed={uuid === selectedUuid}
                onClick={() => onEdit(uuid)}
              >
                <span className="truncate">{name}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-destructive"
                aria-label={`Remove network ${name}`}
                onClick={() => onRemove(uuid)}
              >
                <Minus />
              </Button>
            </div>
          );
        })}
      </div>
      <Button variant="outline" size="sm" onClick={onNew}>
        <Plus />
        New network
      </Button>
    </div>
  );
}
