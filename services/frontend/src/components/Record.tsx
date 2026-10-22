import {
  Fragment,
  FunctionComponent,
  ReactElement,
  useCallback,
  useMemo
} from "react";
import { Button } from "@/components/ui/button";
import { Minus } from "lucide-react";
import TextField from "./global/FormElements/TextField";
import Toggle from "./global/FormElements/Toggle";
import Records, { IRecordsProps } from "./Records";

export interface IFieldType {
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  help?: string;
  type: "text" | "toggle" | "records";
  options?:
    | {
        text: string;
        value: string;
      }[]
    | IRecordsProps;
}

export interface IRecordProps {
  fields: IFieldType[];
  index: number;
  onRemove: (index: number) => void;
  direction?: "column" | "row";
  label?: string;
  renderLayout?: (elements: ReactElement[]) => ReactElement;
  renderField?: (element: ReactElement, field: IFieldType) => ReactElement;
  renderRemove?: (element: ReactElement) => ReactElement;
}

const Record: FunctionComponent<IRecordProps> = (
  props: IRecordProps
): ReactElement => {
  const {
    fields,
    index,
    onRemove,
    renderLayout,
    renderField,
    renderRemove,
    label = "item"
  } = props;

  const handleRemove = useCallback(() => {
    onRemove(index);
  }, [index, onRemove]);

  const renderLayoutWrapper = useMemo(
    () => renderLayout || ((elements: ReactElement[]) => <>{elements}</>),
    [renderLayout]
  );

  const renderFieldWrapper = useMemo(
    () => renderField || ((element: ReactElement) => element),
    [renderField]
  );

  const renderRemoveWrapper = useMemo(
    () => renderRemove || ((element: ReactElement) => element),
    [renderRemove]
  );

  return (
    <div className="flex w-full min-w-0 flex-col items-start gap-3 sm:flex-row">
      {renderLayoutWrapper(
        fields.map((field) => (
          <Fragment key={field.name}>
            {renderFieldWrapper(
              <>
                {field.type === "text" && (
                  <TextField
                    label={field.label}
                    id={field.name}
                    name={field.name}
                    help={field.help}
                    placeholder={
                      field.placeholder && !field.label
                        ? field.placeholder + (field.required ? "*" : "")
                        : ""
                    }
                    required={field.required}
                  />
                )}
                {field.type === "toggle" && (
                  <Toggle
                    name={field.name}
                    label={field.label || field.placeholder || ""}
                    help={field.help}
                    options={(field.options as any) || []}
                  />
                )}
                {field.type === "records" && (
                  <Records {...(field.options as any)} />
                )}
              </>,
              field
            )}
          </Fragment>
        ))
      )}
      {renderRemoveWrapper(
        <div className="flex justify-end content-end">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Remove ${label} item ${index + 1}`}
            className="shrink-0 text-destructive"
            onClick={handleRemove}
          >
            <Minus className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default Record;
