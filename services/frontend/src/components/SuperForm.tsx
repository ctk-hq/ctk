import { FunctionComponent, ReactElement } from "react";
import { styled } from "@mui/material";
import { useSuperForm } from "../hooks";
import { IFormField, TFinalFormField } from "../types";

const Root = styled("div")`
  display: flex;
  flex-direction: column;
  row-gap: ${({ theme }) => theme.spacing(1)};
  @media (max-width: 640px) {
    row-gap: 0;
  }
`;

export interface IRecordFormProps<T extends IFormField> {
  fields: T[];
}

export const SuperForm: FunctionComponent<IRecordFormProps<TFinalFormField>> = <
  T extends IFormField
>(
  props: IRecordFormProps<T>
): ReactElement => {
  const { fields } = props;
  const { renderField } = useSuperForm();

  return <Root>{fields.map(renderField)}</Root>;
};
