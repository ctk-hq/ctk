import { useId } from "react";
import { get } from "lodash";
import { useFormikContext } from "formik";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
export interface IToggleProps {
  name: string;
  label?: string;
  help?: string;
  options: { text: string; value: string }[];
}
export default function Toggle({ label, name, options, help }: IToggleProps) {
  const id = useId();
  const formik = useFormikContext();
  const error = get(formik.touched, name) && get(formik.errors, name);
  return (
    <div className="min-w-0 space-y-2">
      {label && (
        <span id={id} className="block text-sm font-medium">
          {label}
        </span>
      )}
      <ToggleGroup
        type="single"
        value={get(formik.values, name) || ""}
        onValueChange={(value) => formik.setFieldValue(name, value)}
        onBlur={() => formik.setFieldTouched(name, true)}
        aria-labelledby={label ? id : undefined}
        aria-label={label ? undefined : name}
        aria-describedby={error || help ? id + "-description" : undefined}
      >
        {options.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            aria-label={option.text}
          >
            {option.text}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {(error || help) && (
        <p
          id={id + "-description"}
          className={
            error ? "text-xs text-destructive" : "text-xs text-muted-foreground"
          }
        >
          {String(error || help)}
        </p>
      )}
    </div>
  );
}
