import { useState } from "react";
import { XIcon } from "@heroicons/react/outline";
import CreateNetworkModal from "./CreateNetworkModal";
import { CallbackFunction } from "../../../types";
import NetworkEdit from "./Edit";
import { attachUUID } from "../../../utils";

interface IModalNetworkProps {
  networks: Record<string, any>;
  onCreateNetwork: CallbackFunction;
  onUpdateNetwork: CallbackFunction;
  onDeleteNetwork: CallbackFunction;
  onHide: CallbackFunction;
}

const ModalNetwork = (props: IModalNetworkProps) => {
  const {
    networks,
    onCreateNetwork,
    onUpdateNetwork,
    onDeleteNetwork,
    onHide
  } = props;
  const [selectedNetwork, setSelectedNetwork] = useState<any | null>();
  const handleCreate = (values: any) => {
    const uniqueKey = attachUUID(values.key);
    const network = {
      ...values,
      key: uniqueKey
    };
    onCreateNetwork(network);
    setSelectedNetwork(network);
  };
  const handleUpdate = (values: any) => {
    onUpdateNetwork(values);
    setSelectedNetwork(values);
  };
  const handleDelete = () => {
    onDeleteNetwork(selectedNetwork.key);
    setSelectedNetwork(null);
  };
  const handleNew = () => {
    setSelectedNetwork(null);
  };
  const onNetworkSelect = (e: any) => {
    const networkUuid = e.target.value;
    setSelectedNetwork(networks[networkUuid]);
  };

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
              <h3 className="text-sm font-semibold">Top level networks</h3>
              <button
                className="p-1 ml-auto text-black float-right outline-none focus:outline-none"
                onClick={onHide}
              >
                <span className="block outline-none focus:outline-none">
                  <XIcon className="w-4" />
                </span>
              </button>
            </div>

            {networks && Object.keys(networks).length > 0 && (
              <div className="flex flex-row space-x-1 mx-4 mt-2">
                <select
                  id="network"
                  name="network"
                  className="input-util"
                  value={selectedNetwork ? selectedNetwork.key : ""}
                  onChange={onNetworkSelect}
                >
                  <option>select network to edit</option>
                  {Object.keys(networks).map((networkUuid: string) => (
                    <option value={networkUuid} key={networkUuid}>
                      {networks[networkUuid].canvasConfig.node_name}
                    </option>
                  ))}
                </select>

                {selectedNetwork && (
                  <button
                    className="btn-util"
                    type="button"
                    onClick={handleNew}
                  >
                    New
                  </button>
                )}
              </div>
            )}

            {!selectedNetwork && (
              <CreateNetworkModal onCreateNetwork={handleCreate} />
            )}

            {selectedNetwork && (
              <NetworkEdit
                network={selectedNetwork}
                onUpdateNetwork={handleUpdate}
                onDeleteNetwork={handleDelete}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalNetwork;
