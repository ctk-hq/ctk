import { useSuperForm } from "../hooks";
import { IFormField } from "../types";
import { cn } from "@/lib/utils";
export interface IGridColumnProps {
  spans: number[];
  fields: IFormField[];
}
export function GridColumn({ spans, fields }: IGridColumnProps) {
  const { renderField } = useSuperForm();
  return (
    <div
      className={cn(
        "col-span-1 min-w-0 space-y-4",
        spans[0] > 1 ? "sm:col-span-2" : "sm:col-span-1"
      )}
    >
      {fields.map(renderField)}
    </div>
  );
}
