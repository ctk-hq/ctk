import { useState, useEffect, useRef, useCallback } from "react";
import { AnchorId, AnchorLocations } from "@jsplumb/common";
import {
  BeforeDropParams,
  Connection,
  ConnectionDetachedParams,
  ConnectionEstablishedParams,
  ConnectionSelection,
  EVENT_CONNECTION,
  EVENT_CONNECTION_DETACHED,
  INTERCEPT_BEFORE_DROP
} from "@jsplumb/core";
import {
  BrowserJsPlumbInstance,
  newInstance,
  EVENT_DRAG_START,
  EVENT_DRAG_STOP,
  EVENT_CONNECTION_DBL_CLICK,
  DragStartPayload,
  DragStopPayload
} from "@jsplumb/browser-ui";
import {
  defaultOptions,
  inputAnchors,
  outputAnchors,
  sourceEndpoint,
  targetEndpoint
} from "../utils/options";
import eventBus from "../events/eventBus";
import { getConnections } from "../utils";
import { IServiceNodeItem, IVolumeNodeItem } from "../types";
import { Dictionary, isEqual } from "lodash";
import { IAnchor, CallbackFunction } from "../types";

export const useJsPlumb = (
  nodes: Dictionary<IServiceNodeItem | IVolumeNodeItem>,
  connections: Array<[string, string]>,
  onGraphUpdate: CallbackFunction,
  onNodeUpdate: CallbackFunction,
  onConnectionAttached: CallbackFunction,
  onConnectionDetached: CallbackFunction
): [
  (containerElement: HTMLDivElement) => void,
  (zoom: number) => void,
  (style: any) => void,
  (node: IServiceNodeItem) => void
] => {
  const [instance, setInstance] = useState<BrowserJsPlumbInstance>(null as any);
  const containerRef = useRef<HTMLDivElement>();
  const stateRef = useRef<Dictionary<IServiceNodeItem | IVolumeNodeItem>>();
  const instanceRef = useRef<BrowserJsPlumbInstance>();
  stateRef.current = nodes;
  instanceRef.current = instance;
  const containerCallbackRef = useCallback(
    (containerElement: HTMLDivElement) => {
      containerRef.current = containerElement;
    },
    []
  );

  const addEndpoints = useCallback(
    (
      el: Element,
      sourceAnchors: IAnchor[],
      targetAnchors: IAnchor[],
      maxConnections: number
    ) => {
      if (sourceAnchors.length === 0 && targetAnchors.length === 0) {
        instance.addEndpoint(el, {
          endpoint: "Blank"
        });
      }

      sourceAnchors.forEach((x) => {
        const endpoint = sourceEndpoint;
        endpoint.maxConnections = maxConnections;
        instance.addEndpoint(el, endpoint, {
          anchor: [
            [1, 0.6, 1, 0],
            [0, 0.6, -1, 0],
            [0.6, 1, 0, 1],
            [0.6, 0, 0, -1]
          ],
          uuid: x.id,
          connectorOverlays: [
            {
              type: "PlainArrow",
              options: {
                width: 12,
                length: 12,
                location: 1,
                id: "arrow"
              }
            }
          ]
        });
      });

      targetAnchors.forEach((x) => {
        const endpoint = targetEndpoint;
        endpoint.maxConnections = maxConnections;
        instance.addEndpoint(el, endpoint, {
          anchor: AnchorLocations.AutoDefault,
          uuid: x.id
        });
      });
    },
    [instance]
  );

  const removeEndpoint = (node: any) => {
    if (!instanceRef.current) return;

    const instance = instanceRef.current;
    const nodeConnections = instance.getConnections({ target: node.key });

    if (nodeConnections) {
      Object.values(nodeConnections).forEach((conn) => {
        instance.destroyConnector(conn);
        instance.deleteConnection(conn);
      });
    }

    instance.removeAllEndpoints(document.getElementById(node.key) as Element);
    instance.repaintEverything();
  };

  const getAnchors = (port: string[], anchorIds: AnchorId[]): IAnchor[] => {
    return port.map(
      (x, index): IAnchor => ({
        id: x,
        position: anchorIds[port.length === 1 ? 2 : index]
      })
    );
  };

  const getOverlayObject = (instance: BrowserJsPlumbInstance) => {
    return {
      type: "Label",
      options: {
        label: "x",
        location: 0.5,
        id: "remove-conn",
        cssClass: `
        block jtk-overlay remove-conn-btn text-xs leading-normal cursor-pointer
        text-white font-bold rounded-full w-5 h-5 z-20 flex justify-center
        `,
        events: {
          click: (e: any) => {
            instance.deleteConnection(e.overlay.component as Connection);
          }
        }
      }
    };
  };

  const setZoom = useCallback(
    (zoom: number) => {
      if (instance) {
        instance.setZoom(zoom);
      }
    },
    [instance]
  );

  const setStyle = useCallback((style: any) => {
    let styles: { [key: string]: any } = {};
    const currentStyle = containerRef.current?.getAttribute("style");

    if (currentStyle) {
      const currentStyleParts = currentStyle
        .split(";")
        .map((element) => element.trim())
        .filter((element) => element !== "");

      for (let i = 0; i < currentStyleParts.length; i++) {
        const entry = currentStyleParts[i].split(":");
        styles[entry.splice(0, 1)[0]] = entry.join(":").trim();
      }
    }

    styles = { ...styles, ...style };
    const styleString = Object.entries(styles)
      .map(([k, v]) => `${k}:${v}`)
      .join(";");

    containerRef.current?.setAttribute("style", `${styleString}`);
  }, []);

  const onbeforeDropIntercept = (
    instance: BrowserJsPlumbInstance,
    params: BeforeDropParams
  ) => {
    const existingConnections: ConnectionSelection = instance.select({
      source: params.sourceId as any,
      target: params.targetId as any
    });

    // prevent duplicates when switching existing connections
    if (existingConnections.length > 1) {
      return false;
    }

    if (existingConnections.length > 0) {
      const firstConnection: Connection = {
        ...existingConnections.get(0)
      } as Connection;

      // special case to handle existing connections changing targets
      if (firstConnection.suspendedElementId) {
        onConnectionDetached([
          params.sourceId,
          firstConnection.suspendedElementId
        ]);

        if (params.targetId !== firstConnection.suspendedElementId) {
          const loopCheck = instance.select({
            source: params.targetId as any,
            target: params.sourceId as any
          });

          if (loopCheck.length > 0) {
            return false;
          } else {
            onConnectionAttached([params.sourceId, params.targetId]);
            return true;
          }
        }
      }

      // prevent duplicate connections from the same source to target
      if (
        firstConnection.sourceId === params.sourceId &&
        firstConnection.targetId === params.targetId
      ) {
        return false;
      }
    }

    // prevent looping connections between a target and source
    const loopCheck = instance.select({
      source: params.targetId as any,
      target: params.sourceId as any
    });
    if (loopCheck.length > 0) {
      return false;
    }

    // prevent a connection from a target to itself
    if (params.sourceId === params.targetId) {
      return false;
    }

    return true;
  };

  const reset = () => {
    if (!instance) {
      return;
    }

    instance.reset();
    instance.destroy();
  };

  useEffect(() => {
    if (!instance) return;

    if (stateRef.current) {
      Object.values(stateRef.current).forEach((x) => {
        if (!instance.selectEndpoints({ element: x.key as any }).length) {
          const maxConnections = -1;
          const el = document.getElementById(x.key) as Element;

          if (el) {
            addEndpoints(
              el,
              getAnchors(x.outputs, outputAnchors),
              getAnchors(x.inputs, inputAnchors),
              maxConnections
            );
          }
        }
      });

      onGraphUpdate({
        nodes: stateRef.current,
        connections: getConnections(
          instance.getConnections({}, true) as Connection[]
        )
      });
    }
  }, [instance, addEndpoints, onGraphUpdate, stateRef.current]);

  useEffect(() => {
    if (!instance) return;

    const currentConnections = instance.getConnections(
      {},
      true
    ) as Connection[];
    const currentConnectionUuids = (
      instance.getConnections({}, true) as Connection[]
    ).map((x) => x.getUuids());

    currentConnections.forEach((conn: Connection) => {
      const uuids = conn.getUuids();
      uuids[0] = uuids[0].replace("op_", "");
      uuids[1] = uuids[1].replace("ip_", "");

      const c = connections.find((y) => {
        return isEqual([uuids[0], uuids[1]], y);
      });

      if (!c) {
        instance.deleteConnection(conn);
      }
    });

    connections.forEach((x) => {
      const c = currentConnectionUuids.find((y) => {
        return isEqual([`op_${x[0]}`, `ip_${x[1]}`], y);
      });

      if (!c) {
        instance.connect({
          uuids: [`op_${x[0]}`, `ip_${x[1]}`],
          overlays: [getOverlayObject(instance)]
        });
      }
    });
  }, [connections, instance]);

  useEffect(() => {
    const jsPlumbInstance: BrowserJsPlumbInstance = newInstance({
      ...defaultOptions,
      container: containerRef.current
    });

    jsPlumbInstance.bind(EVENT_DRAG_START, function (params: DragStartPayload) {
      eventBus.dispatch("EVENT_DRAG_START", { message: { id: params.el.id } });
    });

    jsPlumbInstance.bind(EVENT_DRAG_STOP, function (params: DragStartPayload) {
      eventBus.dispatch("EVENT_DRAG_STOP", { message: { id: params.el.id } });
    });

    jsPlumbInstance.bind(
      INTERCEPT_BEFORE_DROP,
      function (params: BeforeDropParams) {
        return onbeforeDropIntercept(jsPlumbInstance, params);
      }
    );

    jsPlumbInstance.bind(
      EVENT_CONNECTION_DETACHED,
      function (
        this: BrowserJsPlumbInstance,
        params: ConnectionDetachedParams
      ) {
        onConnectionDetached([params.sourceId, params.targetId]);

        onGraphUpdate({
          nodes: stateRef.current,
          connections: getConnections(
            this.getConnections({}, true) as Connection[]
          )
        });
      }
    );

    jsPlumbInstance.bind(
      EVENT_CONNECTION,
      function (
        this: BrowserJsPlumbInstance,
        params: ConnectionEstablishedParams
      ) {
        if (
          !Object.prototype.hasOwnProperty.call(
            params.connection.overlays,
            "remove-conn"
          )
        ) {
          params.connection.addOverlay(getOverlayObject(this));
          onConnectionAttached([params.sourceId, params.targetId]);
        }

        onGraphUpdate({
          nodes: stateRef.current,
          connections: getConnections(
            this.getConnections({}, true) as Connection[]
          )
        });
      }
    );

    jsPlumbInstance.bind(EVENT_DRAG_STOP, (params: DragStopPayload) => {
      params.elements.forEach((el) => {
        onNodeUpdate({
          key: el.id,
          position: {
            top: el.pos.y,
            left: el.pos.x
          }
        });
      });
    });

    jsPlumbInstance.bind(
      EVENT_CONNECTION_DBL_CLICK,
      (connection: Connection) => {
        jsPlumbInstance.deleteConnection(connection);
      }
    );

    /*
    jsPlumbInstance.bind("drag:move", function (info: any) {
      const parentRect = jsPlumbInstance.getContainer().getBoundingClientRect()
      const childRect = info.el.getBoundingClientRect()
      if (childRect.right > parentRect.right) info.el.style.left = `${parentRect.width - childRect.width}px`
      if (childRect.left < parentRect.left) info.el.style.left = '0px'
      if (childRect.top < parentRect.top) info.el.style.top = '0px'
      if (childRect.bottom > parentRect.bottom) info.el.style.top = `${parentRect.height - childRect.height}px`
    });
    */

    setInstance(jsPlumbInstance);

    return () => {
      reset();
    };
  }, []);

  useEffect(() => {
    eventBus.on("GENERATE", () => {
      if (!instance) return;

      if (stateRef.current) {
        onGraphUpdate({
          nodes: stateRef.current,
          connections: getConnections(
            instance.getConnections({}, true) as Connection[]
          )
        });
      }
    });

    return () => {
      eventBus.remove("GENERATE", () => undefined);
    };
  }, []);

  return [containerCallbackRef, setZoom, setStyle, removeEndpoint];
};
