import { MinusSmIcon, PlusIcon } from "@heroicons/react/outline";
import { Button, styled } from "@mui/joy";
import IconButton from "@mui/joy/IconButton";
import { FunctionComponent, ReactElement } from "react";
import { truncateStr } from "../../../utils";

export interface INetworkListProps {
  networks: Record<string, any>;
  selectedUuid: string;
  onEdit: (networkUuid: string) => void;
  onNew: () => void;
  onRemove: (networkUuid: string) => void;
}

interface IListItemProps {
  selected: boolean;
}

const Root = styled("div")`
  padding: ${({ theme }) => theme.spacing(0)};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-right: solid #eaeaea 1px;
`;

const Top = styled("div")`
  display: flex;
  flex-direction: column;
`;

const Bottom = styled("div")`
  padding: ${({ theme }) => theme.spacing(1, 2)};
`;

const ListItem = styled("div")<IListItemProps>`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  column-gap: ${({ theme }) => theme.spacing(1)};
  padding: ${({ theme }) => theme.spacing(1, 1, 1, 2)};
  cursor: pointer;
  background-color: ${({ selected }) => selected && "#f5f5f5"};

  &:hover {
    background-color: #f5f5f5;
  }
`;

const ListItemText = styled("h5")`
  font-weight: 400;
  font-size: 14px;
`;

const RemoveButton = styled(IconButton)`
  width: 24px;
  max-height: 16px;
`;

const NetworkList: FunctionComponent<INetworkListProps> = (
  props: INetworkListProps
): ReactElement => {
  const { onNew, onRemove, onEdit, networks, selectedUuid } = props;

  const handleEdit = (networkUuid: string) => () => onEdit(networkUuid);

  const handleRemove = (e: any, networkUuid: string) => {
    e.stopPropagation();
    onRemove(networkUuid);
  };

  return (
    <Root>
      <Top>
        {Object.keys(networks).map((networkUuid: string) => (
          <ListItem
            key={networkUuid}
            onClick={handleEdit(networkUuid)}
            selected={networkUuid === selectedUuid}
          >
            <ListItemText>
              {truncateStr(networks[networkUuid].canvasConfig.node_name, 10)}
            </ListItemText>
            <RemoveButton
              variant="soft"
              size="sm"
              color="danger"
              onClick={(e) => handleRemove(e, networkUuid)}
            >
              <MinusSmIcon className="h-4 w-4" />
            </RemoveButton>
          </ListItem>
        ))}
      </Top>

      <Bottom>
        <Button variant="plain" size="sm" onClick={onNew}>
          <PlusIcon className="h-4 w-4 mr-2" />
          New network
        </Button>
      </Bottom>
    </Root>
  );
};

export default NetworkList;
