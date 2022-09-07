import { FunctionComponent, ReactElement, ReactNode } from "react";
import { styled } from "@mui/material";
import { TabContext } from "../contexts";

export interface ITabsProps {
  value: string;
  onChange: (newValue: string) => void;
  children: ReactNode;
}

const Root = styled("div")`
  border-bottom-width: 1px;
  border-color: #e5e7eb;

  @media (min-width: 768px) {
    padding-left: 2rem;
    padding-right: 2rem;
  }
`;

const Nav = styled("nav")`
  display: flex;
  flex-direction: row;
  column-gap: ${({ theme }) => theme.spacing(3)};
  margin-bottom: -1px;
`;

const Tabs: FunctionComponent<ITabsProps> = (
  props: ITabsProps
): ReactElement => {
  const { children, value, onChange } = props;

  return (
    <Root>
      <Nav>
        <TabContext.Provider value={{ value, onChange }}>
          {children}
        </TabContext.Provider>
      </Nav>
    </Root>
  );
};

export default Tabs;
