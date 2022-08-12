import { useCallback, useState } from "react";
import { XIcon } from "@heroicons/react/outline";
import CreateNetworkModal from "./CreateNetworkModal";
import { CallbackFunction, IEditNetworkForm } from "../../../types";
import EditNetworkModal from "./EditNetworkModal";
import { attachUUID, toaster } from "../../../utils";
import { getFinalValues } from "./form-utils";
import EmptyNetworks from "./EmptyNetworks";
import NetworkList from "./NetworkList";
import { styled } from "@mui/joy";

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
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 outline-none focus:outline-none">
        <div
          onClick={onHide}
          className="opacity-25 fixed inset-0 z-40 bg-black"
        ></div>
        <div className="relative w-auto my-6 mx-auto max-w-5xl z-50">
          <div className="border-0 rounded-lg shadow-lg relative flex flex-col w-full bg-white outline-none focus:outline-none">
            <div className="flex items-center justify-between px-4 py-3 border-b border-solid border-blueGray-200 rounded-t">
              <h3 className="text-sm font-semibold">Networks</h3>
              <button
                className="p-1 ml-auto text-black float-right outline-none focus:outline-none"
                onClick={onHide}
              >
                <span className="block outline-none focus:outline-none">
                  <XIcon className="w-4" />
                </span>
              </button>
            </div>

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
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalNetwork;
