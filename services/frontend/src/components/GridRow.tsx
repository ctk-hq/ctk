import { FunctionComponent, ReactElement, ReactNode } from "react";
import { styled } from "@mui/material";
import { useSuperForm } from "../hooks";
import { IFormField } from "../types";

const Root = styled("div")`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-column-gap: 0px;
  grid-row-gap: 0px;
  @media (max-width: 640px) {
    grid-template-columns: repeat(1, 1fr);
  }
  column-gap: ${({ theme }) => theme.spacing(1)};
  width: 100%;
`;

export interface IGridProps {
  fields: IFormField[];
  children?: ReactNode;
}

export const GridRow: FunctionComponent<IGridProps> = (
  props: IGridProps
): ReactElement => {
  const { fields } = props;
  const { renderField } = useSuperForm();

  return <Root>{fields.map(renderField)}</Root>;
};
