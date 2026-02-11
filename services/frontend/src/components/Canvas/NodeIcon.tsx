import {
  CircleStackIcon,
  ServerIcon,
  CpuChipIcon
} from "@heroicons/react/24/outline";

type NodeIconProps = {
  nodeType: string;
};

const NodeIcon = ({ nodeType }: NodeIconProps) => {
  switch (nodeType) {
    case "SERVICE":
      return (
        <ServerIcon className="w-3 h-3 text-gray-500 absolute top-2 right-2" />
      );
    case "VOLUME":
      return (
        <CircleStackIcon className="w-3 h-3 text-gray-500 absolute top-2 right-2" />
      );
    case "NETWORK":
      return (
        <CpuChipIcon className="w-3 h-3 text-gray-500 absolute top-2 right-2" />
      );
    default:
      return (
        <ServerIcon className="w-3 h-3 text-gray-600 absolute top-2 right-2" />
      );
  }
};

export default NodeIcon;
