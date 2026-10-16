import { type ReactNode } from "react";
import { useSuperForm } from "../hooks";
import { IFormField } from "../types";
export interface IGridProps {
  fields: IFormField[];
  children?: ReactNode;
}
export function GridRow({ fields }: IGridProps) {
  const { renderField } = useSuperForm();
  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map(renderField)}
    </div>
  );
}
