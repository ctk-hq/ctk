import { Database, Server, Network } from "lucide-react";

type NodeIconProps = {
  nodeType: string;
};

const NodeIcon = ({ nodeType }: NodeIconProps) => {
  switch (nodeType) {
    case "SERVICE":
      return (
        <Server className="w-3 h-3 text-muted-foreground absolute top-2 right-2" />
      );
    case "VOLUME":
      return (
        <Database className="w-3 h-3 text-muted-foreground absolute top-2 right-2" />
      );
    case "NETWORK":
      return (
        <Network className="w-3 h-3 text-muted-foreground absolute top-2 right-2" />
      );
    default:
      return (
        <Server className="w-3 h-3 text-muted-foreground absolute top-2 right-2" />
      );
  }
};

export default NodeIcon;
