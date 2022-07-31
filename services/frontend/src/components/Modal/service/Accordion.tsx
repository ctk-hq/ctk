import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/outline";
import { styled } from "@mui/joy";
import IconButton from "@mui/joy/IconButton";
import { FunctionComponent, ReactElement, ReactNode } from "react";
import { useAccordionState } from "../../../hooks";

export interface IAccordionProps {
  id: string;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

const Root = styled("div")`
  display: flex;
  flex-direction: column;
`;

const Top = styled("div")`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;

  &:hover {
    cursor: pointer;
    user-select: none;
  }
`;

const Title = styled("h5")`
  font-size: 0.85rem;
  color: #374151;
  font-weight: 700;
  width: 100%;
  text-align: left;
`;

const ExpandButton = styled(IconButton)`
  border-radius: ${({ theme }) => theme.spacing(2)};
`;

const Bottom = styled("div")`
  display: flex;
  flex-direction: column;
  row-gap: ${({ theme }) => theme.spacing(1)};
  padding: ${({ theme }) => theme.spacing(0, 2)};
`;

const Accordion: FunctionComponent<IAccordionProps> = (
  props: IAccordionProps
): ReactElement => {
  const { id, defaultOpen = false, children, title } = props;

  const { open, toggle } = useAccordionState(id, defaultOpen);

  return (
    <Root>
      <Top onClick={toggle}>
        <Title>{title}</Title>
        <ExpandButton size="sm" variant="plain">
          {open && <ChevronUpIcon className="h-5 w-5" />}
          {!open && <ChevronDownIcon className="h-5 w-5" />}
        </ExpandButton>
      </Top>
      {open && <Bottom>{children}</Bottom>}
    </Root>
  );
};

export default Accordion;
