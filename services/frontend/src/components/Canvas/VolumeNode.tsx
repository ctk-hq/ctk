import { useEffect, useState } from "react";
import { DatabaseIcon } from "@heroicons/react/outline";
import { truncateStr } from "../../utils";
import { IVolumeNodeItem, CallbackFunction } from "../../types";
import eventBus from "../../events/eventBus";
import { Popover } from "./Popover";

interface INodeProps {
  node: IVolumeNodeItem;
  setVolumeToEdit: CallbackFunction;
  setVolumeToDelete: CallableFunction;
}

export default function VolumeNode(props: INodeProps) {
  const { node, setVolumeToEdit, setVolumeToDelete } = props;
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
            setVolumeToEdit(node);
          }}
          onDeleteClick={() => {
            setVolumeToDelete(node);
          }}
        ></Popover>
      )}
      <div className="relative node-label w-full py-2 px-4">
        <>
          {node.volumeConfig.name && (
            <div className="text-sm font-semibold overflow-x-hidden">
              {truncateStr(node.volumeConfig.name, 20)}
            </div>
          )}

          <DatabaseIcon className="w-3 h-3 text-gray-600 absolute top-2 right-2" />
        </>
      </div>
    </div>
  );
}
