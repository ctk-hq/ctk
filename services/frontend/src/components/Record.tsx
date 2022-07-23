import { FunctionComponent, ReactElement, useCallback } from "react";
import { styled } from "@mui/joy";
import IconButton from "@mui/joy/IconButton";
import { MinusSmIcon } from "@heroicons/react/solid";
import TextField from "./global/FormElements/InputField";

export interface IFieldType {
  name: string;
  placeholder: string;
  required?: boolean;
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
  align-items: center;
  column-gap: ${({ theme }) => theme.spacing(2)};
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
      {fields.map(({ name, placeholder, required }) => (
        <TextField
          key={name}
          id={name}
          name={name}
          placeholder={placeholder + (required ? "*" : "")}
          required={required}
        />
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
