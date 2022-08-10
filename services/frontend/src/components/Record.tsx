import {
  Fragment,
  FunctionComponent,
  ReactElement,
  useCallback,
  useMemo
} from "react";
import { styled } from "@mui/joy";
import IconButton from "@mui/joy/IconButton";
import { MinusSmIcon } from "@heroicons/react/solid";
import TextField from "./global/FormElements/TextField";
import Toggle from "./global/FormElements/Toggle";
import Records, { IRecordsProps } from "./Records";

export interface IFieldType {
  name: string;
  placeholder?: string;
  required?: boolean;
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
  renderLayout?: (elements: ReactElement[]) => ReactElement;
  renderField?: (element: ReactElement, field: IFieldType) => ReactElement;
  renderRemove?: (element: ReactElement) => ReactElement;
}

const Root = styled("div")`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: flex-start;
  column-gap: ${({ theme }) => theme.spacing(1)};
  width: 100%;

  @media (max-width: 768px) {
    column-gap: ${({ theme }) => theme.spacing(1)};
  }

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

const RemoveButton = styled(IconButton)`
  border-radius: ${({ theme }) => theme.spacing(2)};
`;

const Record: FunctionComponent<IRecordProps> = (
  props: IRecordProps
): ReactElement => {
  const { fields, index, onRemove, renderLayout, renderField, renderRemove } =
    props;

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
    <Root>
      {renderLayoutWrapper(
        fields.map((field) => (
          <Fragment key={field.name}>
            {renderFieldWrapper(
              <>
                {field.type === "text" && (
                  <TextField
                    id={field.name}
                    name={field.name}
                    placeholder={
                      field.placeholder && !(field as any).label
                        ? field.placeholder + (field.required ? "*" : "")
                        : ""
                    }
                    label={(field as any).label}
                    required={field.required}
                  />
                )}
                {field.type === "toggle" && (
                  <Toggle
                    name={field.name}
                    label={field.placeholder || ""}
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
          <RemoveButton
            variant="soft"
            size="sm"
            color="danger"
            onClick={handleRemove}
          >
            <MinusSmIcon className="h-5 w-5" />
          </RemoveButton>
        </div>
      )}
    </Root>
  );
};

export default Record;
