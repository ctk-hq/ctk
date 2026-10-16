import { type ComponentProps } from "react";
import { useFormikContext } from "formik";
import { get } from "lodash";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export interface ITextFieldProps extends ComponentProps<"input"> {
  name: string;
  label?: string;
  help?: string;
}
export default function TextField({
  label,
  name,
  help,
  required,
  id = name,
  ...props
}: ITextFieldProps) {
  const formik = useFormikContext();
  const error = get(formik.touched, name) && get(formik.errors, name);
  const descriptionId = id + "-description";
  return (
    <div className="min-w-0 flex-1 space-y-2">
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && <span aria-hidden="true">*</span>}
        </Label>
      )}
      <Input
        id={id}
        name={name}
        type="text"
        autoComplete="off"
        required={required}
        onBlur={formik.handleBlur}
        onChange={formik.handleChange}
        value={get(formik.values, name) ?? ""}
        aria-label={label ? undefined : props.placeholder || name}
        aria-invalid={Boolean(error)}
        aria-describedby={error || help ? descriptionId : undefined}
        {...props}
      />
      {(error || help) && (
        <p
          id={descriptionId}
          className={
            error ? "text-xs text-destructive" : "text-xs text-muted-foreground"
          }
          role={error ? "alert" : undefined}
        >
          {String(error || help)}
        </p>
      )}
    </div>
  );
}
