import { useSuperForm } from "../hooks";
import { IFormField, TFinalFormField } from "../types";
export interface IRecordFormProps<T extends IFormField> {
  fields: T[];
}
export function SuperForm<T extends TFinalFormField>({
  fields
}: IRecordFormProps<T>) {
  const { renderField } = useSuperForm();
  return (
    <div className="flex min-w-0 flex-col gap-4">{fields.map(renderField)}</div>
  );
}
