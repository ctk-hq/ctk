import { Fragment, FunctionComponent, ReactElement, useCallback } from "react";
import { styled } from "@mui/joy";
import IconButton from "@mui/joy/IconButton";
import { MinusSmIcon } from "@heroicons/react/solid";
import TextField from "./global/FormElements/TextField";
import Toggle from "./global/FormElements/Toggle";

export interface IFieldType {
  name: string;
  placeholder: string;
  required?: boolean;
  type: "text" | "toggle";
  options?: {
    text: string;
    value: string;
  }[];
}

export interface IRecordProps {
  fields: IFieldType[];
  index: number;
  onRemove: (index: number) => void;
}

const Root = styled("div")`
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: flex-start;
  column-gap: ${({ theme }) => theme.spacing(2)};
  @media (max-width: 768px) {
    column-gap: ${({ theme }) => theme.spacing(1)};
  }
`;

const RemoveButton = styled(IconButton)``;

const Record: FunctionComponent<IRecordProps> = (
  props: IRecordProps
): ReactElement => {
  const { fields, index, onRemove } = props;

  const handleRemove = useCallback(() => {
    onRemove(index);
  }, [index, onRemove]);

  return (
    <Root>
      {fields.map(({ type, name, placeholder, required, options }) => (
        <Fragment key={name}>
          {type === "text" && (
            <TextField
              id={name}
              name={name}
              placeholder={placeholder + (required ? "*" : "")}
              required={required}
            />
          )}
          {type === "toggle" && (
            <Toggle name={name} label={placeholder} options={options || []} />
          )}
        </Fragment>
      ))}
      <RemoveButton
        variant="soft"
        size="sm"
        color="danger"
        onClick={handleRemove}
      >
        <MinusSmIcon className="h-5 w-5" />
      </RemoveButton>
    </Root>
  );
};

export default Record;
