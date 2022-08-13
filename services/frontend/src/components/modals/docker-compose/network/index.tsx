import { useCallback, useState } from "react";
import CreateNetworkModal from "./CreateNetworkModal";
import { CallbackFunction, IEditNetworkForm } from "../../../../types";
import EditNetworkModal from "./EditNetworkModal";
import { attachUUID, toaster } from "../../../../utils";
import { getFinalValues } from "./form-utils";
import EmptyNetworks from "./EmptyNetworks";
import NetworkList from "./NetworkList";
import { styled } from "@mui/joy";
import Modal from "../../../Modal";

interface IModalNetworkProps {
  networks: Record<string, any>;
  onCreateNetwork: CallbackFunction;
  onUpdateNetwork: CallbackFunction;
  onDeleteNetwork: CallbackFunction;
  onHide: CallbackFunction;
}

const Container = styled("div")`
  display: flex;
  flex-direction: row;
`;

const NetworkFormContainer = styled("div")`
  display: flex;
  flex-direction: column;
`;

const ModalNetwork = (props: IModalNetworkProps) => {
  const {
    networks,
    onCreateNetwork,
    onUpdateNetwork,
    onDeleteNetwork,
    onHide
  } = props;
  const [selectedNetwork, setSelectedNetwork] = useState<any | null>();
  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = (values: IEditNetworkForm) => {
    const finalValues = getFinalValues(values);
    const uniqueKey = attachUUID(finalValues.key);
    const network = {
      ...finalValues,
      key: uniqueKey
    };
    onCreateNetwork(network);
    setSelectedNetwork(network);

    toaster(`Created "${values.entryName}" network successfully`, "success");
  };

  const handleUpdate = (values: IEditNetworkForm) => {
    const finalValues = getFinalValues(values, selectedNetwork);
    onUpdateNetwork(finalValues);
    setSelectedNetwork(finalValues);

    toaster(`Updated "${values.entryName}" network successfully`, "success");
  };

  const handleRemove = useCallback(
    (networkUuid: string) => {
      onDeleteNetwork(networkUuid);
      if (selectedNetwork?.key === networkUuid) {
        setSelectedNetwork(null);
      }
    },
    [onDeleteNetwork, selectedNetwork]
  );

  const handleNew = useCallback(() => {
    setShowCreate(true);
    setSelectedNetwork(null);
  }, []);

  const handleEdit = useCallback(
    (networkUuid: string) => {
      setSelectedNetwork(networks[networkUuid]);
    },
    [networks]
  );

  const networkKeys = Object.keys(networks);

  return (
    <Modal
      title={selectedNetwork ? "Edit network" : "Create network"}
      onHide={onHide}
    >
      {networkKeys.length === 0 && !showCreate && (
        <EmptyNetworks onCreate={handleNew} />
      )}

      {(networkKeys.length > 0 || showCreate) && (
        <Container>
          {networkKeys.length > 0 && (
            <NetworkList
              networks={networks}
              onNew={handleNew}
              onRemove={handleRemove}
              onEdit={handleEdit}
              selectedUuid={selectedNetwork?.key}
            />
          )}

          <NetworkFormContainer>
            {!selectedNetwork && (
              <CreateNetworkModal onCreateNetwork={handleCreate} />
            )}

            {selectedNetwork && (
              <EditNetworkModal
                network={selectedNetwork}
                onUpdateNetwork={handleUpdate}
              />
            )}
          </NetworkFormContainer>
        </Container>
      )}
    </Modal>
  );
};

export default ModalNetwork;
