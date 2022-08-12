import { styled } from "@mui/joy";
import { FunctionComponent, ReactElement, ReactNode } from "react";

export interface ITabsProps {
  children: ReactNode;
}

const Root = styled("div")`
  padding-left: 1rem;
  padding-right: 1rem;
  border-bottom-width: 1px;
  border-color: #e5e7eb;

  @media (min-width: 768px) {
    padding-left: 2rem;
    padding-right: 2rem;
  }
`;

const Nav = styled("nav")`
  display: flex;
  margin-bottom: -1px;
  margin-left: 1rem;

  @media (min-width: 768px) {
    margin-left: 2rem;
  }
`;

const Tabs: FunctionComponent<ITabsProps> = (
  props: ITabsProps
): ReactElement => {
  const { children } = props;

  return (
    <Root>
      <Nav aria-label="Tabs">{children}</Nav>
    </Root>
  );
};

export default Tabs;
