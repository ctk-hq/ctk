import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/outline";
import { styled } from "@mui/joy";
import IconButton from "@mui/joy/IconButton";
import { useCallback, useState } from "react";

const Root = styled("div")`
  // display: flex;
  // flex-direction: column;
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
  font-size: 12px;
  font-weight: 500;
  color: #374151;
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

const Accordion = (props: any) => {
  const { children, title } = props;
  const [open, setOpen] = useState(false);

  const handleToggle = useCallback(() => {
    setOpen((open) => !open);
  }, []);

  return (
    <Root>
      <Top onClick={handleToggle}>
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
