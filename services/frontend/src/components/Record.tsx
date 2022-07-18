import { FunctionComponent, ReactElement, useCallback } from "react";
import { styled } from "@mui/joy";
import IconButton from "@mui/joy/IconButton";
import { MinusSmIcon } from "@heroicons/react/solid";
import lodash from "lodash";

export interface IFieldType {
  name: string;
  placeholder: string;
}

export interface IRecordProps {
  formik: any;
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
  const { formik, fields, index, onRemove } = props;

  const handleRemove = useCallback(() => {
    onRemove(index);
  }, [index, onRemove]);

  return (
    <Root>
      {fields.map(({ name, placeholder }) => (
        <input
          key={name}
          id={name}
          name={name}
          type="text"
          placeholder={placeholder}
          autoComplete="none"
          className="input-util"
          onChange={formik.handleChange}
          value={lodash.get(formik.values, name)}
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
