import { styled } from "@mui/joy";
import { Fragment, FunctionComponent, ReactElement, useCallback } from "react";
import { PlusIcon } from "@heroicons/react/outline";
import Record, { IFieldType } from "./Record";
import { useFormikContext } from "formik";
import lodash from "lodash";
import IconButton from "@mui/joy/IconButton";

export interface IRecordsProps {
  title: string;
  referred: string;
  name: string;
  fields: (index: number) => IFieldType[];
  newValue: any;
  renderLayout?: (elements: ReactElement[]) => ReactElement;
  renderField?: (element: ReactElement, field: IFieldType) => ReactElement;
  renderRemove?: (element: ReactElement) => ReactElement;
  renderBorder?: () => ReactElement;
}

interface IGroupProps {
  empty: boolean;
}

const Group = styled("div", {
  shouldForwardProp: (propName) => propName !== "empty"
})<IGroupProps>`
  display: flex;
  flex-direction: column;
  align-items: ${({ empty }) => (empty ? "center" : "flex-end")};
  row-gap: ${({ theme }) => theme.spacing(1)};
`;

const GroupTitle = styled("h5")`
  font-size: 0.85rem;
  color: #374151;
  font-weight: 700;
  width: 100%;
  text-align: left;
`;

const RecordList = styled("div")`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  row-gap: ${({ theme }) => theme.spacing(1)};
  margin-top: ${({ theme }) => theme.spacing(1)};
  width: 100%;
`;

const AddButton = styled(IconButton)`
  margin-top: ${({ theme }) => theme.spacing(1)};
  border-radius: ${({ theme }) => theme.spacing(2)};
`;

const Description = styled("p")`
  margin-top: ${({ theme }) => theme.spacing(1)};
  text-align: center;
  color: #7a7a7a;
  font-size: 14px;
  width: 100%;
`;

const Records: FunctionComponent<IRecordsProps> = (
  props: IRecordsProps
): ReactElement => {
  const {
    title,
    referred,
    name,
    fields,
    newValue,
    renderLayout,
    renderField,
    renderRemove,
    renderBorder
  } = props;

  const formik = useFormikContext();
  const items = lodash.get(formik.values, name);

  if (!items) {
    throw new Error(`"${name}" is falsy.`);
  }

  const handleNew = useCallback(() => {
    formik.setFieldValue(`${name}[${items.length}]`, newValue);
  }, [formik]);

  const handleRemove = useCallback(
    (index: number) => {
      const newOptions = items.filter(
        (_: unknown, currentIndex: number) => currentIndex != index
      );
      formik.setFieldValue(name, newOptions);
    },
    [formik]
  );

  const empty = items && items.length === 0;

  return (
    <Group empty={empty}>
      <GroupTitle>{title}</GroupTitle>
      {!empty && (
        <RecordList>
          {items.map((_: unknown, index: number) => (
            <Fragment key={index}>
              <Record
                index={index}
                fields={fields(index)}
                onRemove={handleRemove}
                renderLayout={renderLayout}
                renderField={renderField}
                renderRemove={renderRemove}
              />
              {renderBorder && renderBorder()}
            </Fragment>
          ))}
        </RecordList>
      )}

      {empty && <Description>No items available</Description>}

      <AddButton size="sm" variant="soft" onClick={handleNew}>
        <PlusIcon className="h-4 w-4" />
      </AddButton>
    </Group>
  );
};

export default Records;
