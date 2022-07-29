import { Button, styled } from "@mui/joy";
import { FunctionComponent, ReactElement } from "react";

const Root = styled("div")`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: ${({ theme }) => theme.spacing(2, 5, 5, 5)};
  text-align: center;
`;

const Image = styled("img")`
  width: 300px;
  height: auto;
`;

const CreateNew = styled(Button)`
  margin-top: ${({ theme }) => theme.spacing(1)};
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
      <Image src="https://res.cloudinary.com/hypertool/image/upload/v1657816359/hypertool-assets/empty-projects_fdcxtk.svg" />
      <p className="mt-4 text-md text-gray-500 dark:text-gray-400">
        We tried our best, but could not find any networks.
      </p>
      <CreateNew variant="solid" size="sm" onClick={onCreate}>
        Create new network
      </CreateNew>
    </Root>
  );
};

export default EmptyNetworks;
