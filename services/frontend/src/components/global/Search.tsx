import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
export default function Search({ onSearchChange }: { onSearchChange: any }) {
  return (
    <div className="relative min-w-0 flex-1">
      <SearchIcon className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
      <Input
        aria-label="Search"
        className="pl-9"
        placeholder="Search"
        type="search"
        name="search"
        onChange={onSearchChange}
      />
    </div>
  );
}
