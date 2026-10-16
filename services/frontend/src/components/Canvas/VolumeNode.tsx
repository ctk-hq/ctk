import { useState } from "react";
import { truncateStr } from "../../utils";
import { IVolumeNodeItem, CallbackFunction } from "../../types";
import { Popover } from "./Popover";
import NodeIcon from "./NodeIcon";

interface INodeProps {
  node: IVolumeNodeItem;
  isDragging: boolean;
  setVolumeToEdit: CallbackFunction;
  setVolumeToDelete: CallableFunction;
}

export default function VolumeNode(props: INodeProps) {
  const { node, isDragging, setVolumeToEdit, setVolumeToDelete } = props;
  const [nodeHovering, setNodeHovering] = useState<string | null>();

  return (
    <div
      key={node.key}
      data-canvas-node
      className="node-item group flex cursor-pointer flex-col rounded-lg border bg-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      tabIndex={0}
      role="group"
      aria-label={`Volume ${node.canvasConfig.node_name}`}
      onFocus={() => setNodeHovering(node.key)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setNodeHovering(null);
      }}
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
            setVolumeToEdit(node);
          }}
          onDeleteClick={() => {
            setVolumeToDelete(node);
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

          {node.volumeConfig.name && (
            <div className="text-xs text-muted-foreground overflow-x-hidden">
              {truncateStr(node.volumeConfig.name, 20)}
            </div>
          )}

          <NodeIcon nodeType={node.type} />
        </>
      </div>
    </div>
  );
}
