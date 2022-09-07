import { FunctionComponent, HTMLProps, ReactElement, ReactNode } from "react";
import { styled } from "@mui/material";

export interface IScrollViewProps extends HTMLProps<HTMLDivElement> {
  children: ReactNode;
  height: string;
}

interface IRootProps extends HTMLProps<HTMLDivElement> {
  fixedHeight: string;
}

const Root = styled("div", {
  shouldForwardProp: (propName) => propName !== "height"
})<IRootProps>`
  overflow: auto;
  height: ${({ height }) => height};

  ::-webkit-scrollbar {
    width: 4px;
  }

  ::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  ::-webkit-scrollbar-thumb {
    background-color: #999;
    border: #aaa;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
` as any;

export const ScrollView: FunctionComponent<IScrollViewProps> = (
  props: IScrollViewProps
): ReactElement => {
  const { height, children, ...otherProps } = props;
  return (
    <Root height={height} {...otherProps}>
      {children}
    </Root>
  );
};
