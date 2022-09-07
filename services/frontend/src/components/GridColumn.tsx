import { FunctionComponent, ReactElement } from "react";
import { styled } from "@mui/material";
import { useSuperForm } from "../hooks";
import { IFormField } from "../types";

interface IRootProps {
  spans: number[];
}

const Root = styled("div", {
  shouldForwardProp: (name) => name !== "spans"
})<IRootProps>`
  grid-column: span ${({ spans }) => spans[0]};
  @media (max-width: 640px) {
    grid-column: span ${({ spans }) => spans[1]};
  }
`;

export interface IGridColumnProps {
  spans: number[];
  fields: IFormField[];
}

export const GridColumn: FunctionComponent<IGridColumnProps> = (
  props: IGridColumnProps
): ReactElement => {
  const { spans, fields } = props;
  const { renderField } = useSuperForm();

  return <Root spans={spans}>{fields.map(renderField)}</Root>;
};
