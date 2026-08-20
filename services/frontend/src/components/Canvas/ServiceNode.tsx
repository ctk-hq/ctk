import { useState } from "react";
import { truncateStr } from "../../utils";
import { IServiceNodeItem, CallbackFunction } from "../../types";
import { Popover } from "./Popover";
import NodeIcon from "./NodeIcon";

interface INodeProps {
  node: IServiceNodeItem;
  isDragging: boolean;
  setServiceToEdit: CallbackFunction;
  setServiceToDelete: CallableFunction;
}

export default function ServiceNode(props: INodeProps) {
  const { node, isDragging, setServiceToEdit, setServiceToDelete } = props;
  const [nodeHovering, setNodeHovering] = useState<string | null>();

  return (
    <div
      key={node.key}
      data-canvas-node
      className={"node-item cursor-pointer shadow flex flex-col group"}
      id={node.key}
      style={{ top: node.position.top, left: node.position.left }}
      onMouseEnter={() => setNodeHovering(node.key)}
      onMouseLeave={() => {
        if (nodeHovering === node.key) {
          setNodeHovering(null);
        }
      }}
    >
      {nodeHovering === node.key && !isDragging && (
        <Popover
          onEditClick={() => {
            setServiceToEdit(node);
          }}
          onDeleteClick={() => {
            setServiceToDelete(node);
          }}
        ></Popover>
      )}
      <div className="relative node-label w-full py-2 px-4">
        <>
          {node.canvasConfig.node_name && (
            <div className="text-sm font-semibold overflow-x-hidden">
              {truncateStr(node.canvasConfig.node_name, 12)}
            </div>
          )}

          {node.serviceConfig.container_name && (
            <div className="text-xs text-gray-500 overflow-x-hidden">
              {truncateStr(node.serviceConfig.container_name, 20)}
            </div>
          )}

          <NodeIcon nodeType={node.type} />
        </>
      </div>
    </div>
  );
}
