import { useEffect, useState } from "react";
import { truncateStr } from "../../utils";
import { IServiceNodeItem, CallbackFunction } from "../../types";
import eventBus from "../../events/eventBus";
import { Popover } from "./Popover";
import NodeIcon from "./NodeIcon";

interface INodeProps {
  node: IServiceNodeItem;
  setServiceToEdit: CallbackFunction;
  setServiceToDelete: CallableFunction;
}

export default function ServiceNode(props: INodeProps) {
  const { node, setServiceToEdit, setServiceToDelete } = props;
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
