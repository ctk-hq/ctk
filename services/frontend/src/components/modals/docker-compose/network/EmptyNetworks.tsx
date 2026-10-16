import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
export interface IEmptyNetworksProps {
  onCreate: () => void;
}
export default function EmptyNetworks({ onCreate }: IEmptyNetworksProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <p className="text-sm text-muted-foreground">
        No top-level networks available
      </p>
      <Button variant="outline" onClick={onCreate}>
        <Plus />
        New network
      </Button>
    </div>
  );
}
