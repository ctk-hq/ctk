import { FC, useState, useEffect } from "react";
import { Dictionary, values } from "lodash";
import { v4 as uuidv4 } from "uuid";
import eventBus from "../../events/eventBus";
import {
  IGraphData,
  CallbackFunction,
  IServiceNodeItem,
  IVolumeNodeItem
} from "../../types";
import { useJsPlumb } from "../useJsPlumb";
import ServiceNode from "./ServiceNode";
import VolumeNode from "./VolumeNode";

const CANVAS_ID: string = "canvas-container-" + uuidv4();

interface ICanvasProps {
  nodes: Dictionary<IServiceNodeItem | IVolumeNodeItem>;
  connections: any;
  canvasPosition: any;
  onNodeUpdate: CallbackFunction;
  onGraphUpdate: CallbackFunction;
  onCanvasUpdate: CallbackFunction;
  onConnectionAttached: CallbackFunction;
  onConnectionDetached: CallbackFunction;
  setServiceToEdit: CallbackFunction;
  setServiceToDelete: CallbackFunction;
  setVolumeToEdit: CallbackFunction;
  setVolumeToDelete: CallbackFunction;
}

export const Canvas: FC<ICanvasProps> = (props) => {
  const {
    nodes,
    connections,
    canvasPosition,
    onNodeUpdate,
    onGraphUpdate,
    onCanvasUpdate,
    onConnectionAttached,
    onConnectionDetached,
    setServiceToEdit,
    setServiceToDelete,
    setVolumeToEdit,
    setVolumeToDelete
  } = props;
  const [dragging, setDragging] = useState(false);
  const [scale, setScale] = useState(1);
  const [_scale, _setScale] = useState(1);
  const [_left, _setLeft] = useState(0);
  const [_top, _setTop] = useState(0);
  const [_initX, _setInitX] = useState(0);
  const [_initY, _setInitY] = useState(0);

  const translateWidth =
    (document.documentElement.clientWidth * (1 - _scale)) / 2;
  const translateHeight =
    ((document.documentElement.clientHeight - 64) * (1 - _scale)) / 2;

  const [containerCallbackRef, setZoom, setStyle, removeEndpoint] = useJsPlumb(
    nodes,
    connections,
    (graphData: IGraphData) => onGraphUpdate(graphData),
    (positionData: any) => onNodeUpdate(positionData),
    (connectionData: any) => onConnectionAttached(connectionData),
    (connectionData: any) => onConnectionDetached(connectionData)
  );

  const onCanvasMousewheel = (e: any) => {
    if (e.deltaY < 0) {
      _setScale(_scale + _scale * 0.25);
      setScale(_scale + _scale * 0.25);
    }

    if (e.deltaY > 0) {
      _setScale(_scale - _scale * 0.25);
      setScale(_scale - _scale * 0.25);
    }
  };

  const onCanvasMouseUpLeave = (e: any) => {
    if (dragging) {
      const left = _left + e.pageX - _initX;
      const top = _top + e.pageY - _initY;

      _setLeft(left);
      _setTop(top);
      setDragging(false);
      onCanvasUpdate({
        left: left,
        top: top
      });
    }
  };

  const onCanvasMouseMove = (e: any) => {
    if (!dragging) {
      return;
    }

    const styles = {
      left: _left + e.pageX - _initX + "px",
      top: _top + e.pageY - _initY + "px"
    };

    setStyle(styles);
  };

  const onCanvasMouseDown = (e: any) => {
    _setInitX(e.pageX);
    _setInitY(e.pageY);
    setDragging(true);
  };

  useEffect(() => {
    setZoom(_scale);
  }, [_scale]);

  useEffect(() => {
    onCanvasUpdate({
      scale: scale
    });
  }, [scale]);

  useEffect(() => {
    const styles = {
      left: _left + "px",
      top: _top + "px"
    };

    setStyle(styles);
  }, [_left, _top, setStyle]);

  useEffect(() => {
    _setTop(canvasPosition.top);
    _setLeft(canvasPosition.left);
    _setScale(canvasPosition.scale);
  }, [canvasPosition]);

  useEffect(() => {
    eventBus.on("NODE_DELETED", (data: any) => {
      removeEndpoint(data.detail.message.node);
    });

    return () => {
      eventBus.remove("NODE_DELETED", () => undefined);
    };
  }, []);

  return (
    <>
      {nodes && (
        <div
          key={CANVAS_ID}
          className="jsplumb-box"
          onWheel={onCanvasMousewheel}
          onMouseMove={onCanvasMouseMove}
          onMouseDown={onCanvasMouseDown}
          onMouseUp={onCanvasMouseUpLeave}
          onMouseLeave={onCanvasMouseUpLeave}
          onContextMenu={(event) => {
            event.stopPropagation();
            event.preventDefault();
          }}
        >
          <div
            id={CANVAS_ID}
            ref={containerCallbackRef}
            className="canvas h-full w-full"
            style={{
              transformOrigin: "0px 0px 0px",
              transform: `translate(${translateWidth}px, ${translateHeight}px) scale(${_scale})`
            }}
          >
            {values(nodes).map((x) => {
              if (x.type === "SERVICE") {
                x = x as IServiceNodeItem;
                return (
                  <ServiceNode
                    key={x.key}
                    node={x}
                    setServiceToEdit={setServiceToEdit}
                    setServiceToDelete={setServiceToDelete}
                  />
                );
              }

              if (x.type === "VOLUME") {
                x = x as IVolumeNodeItem;
                return (
                  <VolumeNode
                    key={x.key}
                    node={x}
                    setVolumeToEdit={setVolumeToEdit}
                    setVolumeToDelete={setVolumeToDelete}
                  />
                );
              }
            })}
          </div>
        </div>
      )}
    </>
  );
};
