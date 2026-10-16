import Spinner from "./Spinner";
import { Button } from "@/components/ui/button";
interface IPaginationProps {
  defaultCurrent: number;
  defaultPageSize: number;
  onChange: () => void;
  total: number;
  loading: boolean;
}
export default function Pagination({
  defaultCurrent,
  onChange,
  total,
  loading
}: IPaginationProps) {
  return (
    <div className="space-y-4 text-center">
      <span className="block text-sm text-muted-foreground">{`showing ${defaultCurrent} of ${total}`}</span>
      <Button variant="outline" disabled={loading} onClick={onChange}>
        {loading && <Spinner className="size-4" />}Load more
      </Button>
    </div>
  );
}
