import { useEffect, useState } from "react";
import { IClientNodeItem, CallbackFunction } from "../../types";
import eventBus from "../../events/eventBus";
import { Popover } from "./Popover";

interface INodeProps {
  node: IClientNodeItem;
  setNodeForEdit: CallbackFunction;
  setNodeForDelete: CallableFunction;
}

export default function Node(props: INodeProps) {
  const { node, setNodeForEdit, setNodeForDelete } = props;
  const [nodeDragging, setNodeDragging] = useState<string | null>();
  const [nodeHovering, setNodeHovering] = useState<string | null>();

  useEffect(() => {
    eventBus.on("EVENT_DRAG_START", (data: any) => {
      setNodeDragging(data.detail.message.id);
    });

    eventBus.on("EVENT_DRAG_STOP", () => {
      setNodeDragging(null);
    });

    return () => {
      eventBus.remove("EVENT_DRAG_START", () => undefined);
      eventBus.remove("EVENT_DRAG_STOP", () => undefined);
    };
  }, []);

  return (
    <div
      key={node.key}
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
      {nodeHovering === node.key && nodeDragging !== node.key && (
        <Popover
          onEditClick={() => {
            setNodeForEdit(node);
          }}
          onDeleteClick={() => {
            setNodeForDelete(node);
          }}
        ></Popover>
      )}
      <div className="node-label w-full py-2 px-4">
        <div className="text-sm font-semibold overflow-x-hidden">
          {node.canvasConfig.service_name}
        </div>
        <div className="text-xs text-gray-500 overflow-x-hidden">
          {node.serviceConfig?.container_name}
        </div>
      </div>
    </div>
  );
}
