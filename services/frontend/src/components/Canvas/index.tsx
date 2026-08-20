import {
  FC,
  PointerEvent as ReactPointerEvent,
  WheelEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState
} from "react";
import { Dictionary, values } from "lodash";

import {
  CallbackFunction,
  IServiceNodeItem,
  IServiceNodePosition,
  IVolumeNodeItem
} from "../../types";
import { CanvasConnection } from "./graphState";
import ServiceNode from "./ServiceNode";
import { useJsPlumbCanvas } from "./useJsPlumbCanvas";
import VolumeNode from "./VolumeNode";

export interface CanvasPosition {
  left: number;
  scale: number;
  top: number;
}

interface ICanvasProps {
  nodes: Dictionary<IServiceNodeItem | IVolumeNodeItem>;
  connections: CanvasConnection[];
  canvasPosition: CanvasPosition;
  onNodeUpdate: (position: IServiceNodePosition) => void;
  onCanvasUpdate: (position: Partial<CanvasPosition>) => void;
  onConnectionAttached: (connection: CanvasConnection) => void;
  onConnectionDetached: (connection: CanvasConnection) => void;
  setServiceToEdit: CallbackFunction;
  setServiceToDelete: CallbackFunction;
  setVolumeToEdit: CallbackFunction;
  setVolumeToDelete: CallbackFunction;
}

interface PanGesture {
  originLeft: number;
  originTop: number;
  pointerId: number;
  startX: number;
  startY: number;
}

const MIN_SCALE = 0.4;
const MAX_SCALE = 2;

export const Canvas: FC<ICanvasProps> = ({
  nodes,
  connections,
  canvasPosition,
  onNodeUpdate,
  onCanvasUpdate,
  onConnectionAttached,
  onConnectionDetached,
  setServiceToEdit,
  setServiceToDelete,
  setVolumeToEdit,
  setVolumeToDelete
}) => {
  const reactId = useId();
  const canvasId = `canvas-${reactId.replace(/:/g, "")}`;
  const panGestureRef = useRef<PanGesture | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [viewport, setViewport] = useState<CanvasPosition>(canvasPosition);

  const { setContainer, setZoom } = useJsPlumbCanvas({
    nodes,
    connections,
    onNodeUpdate,
    onConnectionAttached,
    onConnectionDetached,
    onDragStateChange: setDraggingNodeId
  });

  useEffect(() => {
    setViewport(canvasPosition);
  }, [canvasPosition]);

  useEffect(() => {
    setZoom(viewport.scale);
  }, [setZoom, viewport.scale]);

  const finishPanning = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const gesture = panGestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;

      const left = gesture.originLeft + event.clientX - gesture.startX;
      const top = gesture.originTop + event.clientY - gesture.startY;
      panGestureRef.current = null;
      setIsPanning(false);
      setViewport((current) => ({ ...current, left, top }));
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      onCanvasUpdate({ left, top });
    },
    [onCanvasUpdate]
  );

  const startPanning = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    const target = event.target as Element;
    if (
      target.closest(
        "[data-canvas-node], .jtk-endpoint, .jtk-connector, .jtk-overlay, button, input, select, textarea"
      )
    ) {
      return;
    }

    panGestureRef.current = {
      originLeft: viewport.left,
      originTop: viewport.top,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY
    };
    setIsPanning(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const movePanning = (event: ReactPointerEvent<HTMLDivElement>) => {
    const gesture = panGestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    setViewport((current) => ({
      ...current,
      left: gesture.originLeft + event.clientX - gesture.startX,
      top: gesture.originTop + event.clientY - gesture.startY
    }));
  };

  const zoomCanvas = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const direction = event.deltaY < 0 ? 1 : -1;
    const nextScale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, viewport.scale * (direction > 0 ? 1.2 : 0.8))
    );
    if (nextScale === viewport.scale) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - bounds.left;
    const pointerY = event.clientY - bounds.top;
    const worldX = (pointerX - viewport.left) / viewport.scale;
    const worldY = (pointerY - viewport.top) / viewport.scale;
    const nextViewport = {
      left: pointerX - worldX * nextScale,
      top: pointerY - worldY * nextScale,
      scale: nextScale
    };

    setViewport(nextViewport);
    onCanvasUpdate(nextViewport);
  };

  return (
    <div
      className="jsplumb-box"
      data-panning={isPanning}
      onWheel={zoomCanvas}
      onPointerDown={startPanning}
      onPointerMove={movePanning}
      onPointerUp={finishPanning}
      onPointerCancel={finishPanning}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div
        id={canvasId}
        ref={setContainer}
        className="canvas"
        style={{
          transform: `translate3d(${viewport.left}px, ${viewport.top}px, 0) scale(${viewport.scale})`,
          transformOrigin: "0 0"
        }}
      >
        {values(nodes).map((node) => {
          if (node.type === "SERVICE") {
            return (
              <ServiceNode
                key={node.key}
                node={node as IServiceNodeItem}
                isDragging={draggingNodeId === node.key}
                setServiceToEdit={setServiceToEdit}
                setServiceToDelete={setServiceToDelete}
              />
            );
          }

          return (
            <VolumeNode
              key={node.key}
              node={node as IVolumeNodeItem}
              isDragging={draggingNodeId === node.key}
              setVolumeToEdit={setVolumeToEdit}
              setVolumeToDelete={setVolumeToDelete}
            />
          );
        })}
      </div>
    </div>
  );
};
