import { CallbackFunction } from "@/types";
import NetworkForm from "./NetworkForm";
export default function CreateNetworkModal({
  onCreateNetwork
}: {
  onCreateNetwork: CallbackFunction;
}) {
  return <NetworkForm onSubmit={onCreateNetwork} />;
}
