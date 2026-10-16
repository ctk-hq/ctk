import { CallbackFunction } from "@/types";
import NetworkForm from "./NetworkForm";
export default function EditNetworkModal({
  onUpdateNetwork,
  network
}: {
  onUpdateNetwork: CallbackFunction;
  network: any;
}) {
  return <NetworkForm network={network} onSubmit={onUpdateNetwork} />;
}
