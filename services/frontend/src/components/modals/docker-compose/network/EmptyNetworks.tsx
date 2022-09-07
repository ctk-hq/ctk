import { FunctionComponent, ReactElement } from "react";
import { Button, styled } from "@mui/material";
import { PlusIcon } from "@heroicons/react/outline";

const Root = styled("div")`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: ${({ theme }) => theme.spacing(2, 5, 5, 5)};
  text-align: center;
`;

const AddButton = styled(Button)`
  margin-top: ${({ theme }) => theme.spacing(1)};
  text-transform: none;
`;

const Description = styled("p")`
  margin-top: ${({ theme }) => theme.spacing(1)};
  text-align: center;
  color: #7a7a7a;
  font-size: 14px;
`;

export interface IEmptyNetworksProps {
  onCreate: () => void;
}

const EmptyNetworks: FunctionComponent<IEmptyNetworksProps> = (
  props: IEmptyNetworksProps
): ReactElement => {
  const { onCreate } = props;
  return (
    <Root>
      <Description>No top-level networks available</Description>

      <AddButton
        size="small"
        variant="text"
        onClick={onCreate}
        disableElevation={true}
        disableRipple={true}
      >
        <PlusIcon className="h-4 w-4 mr-2" />
        New network
      </AddButton>
    </Root>
  );
};

export default EmptyNetworks;
