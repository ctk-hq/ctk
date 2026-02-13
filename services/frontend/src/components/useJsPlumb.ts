import { useState, useEffect, useRef, useCallback } from "react";
import { AnchorId, AnchorLocations } from "@jsplumb/common";
import {
  BeforeDropParams,
  ConnectionDetachedParams,
  ConnectionEstablishedParams,
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
  DragStopPayload,
  Connection
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

const defaultConnectionPaintStyle = {
  strokeWidth: 2,
  stroke: "#61B7CF"
};

const defaultConnectionHoverStyle = {
  strokeWidth: 3,
  stroke: "#216477"
};

const volumeConnectionPaintStyle = {
  strokeWidth: 2,
  stroke: "#ad35ff"
};

const volumeConnectionHoverStyle = {
  strokeWidth: 3,
  stroke: "#7d0fc8"
};

interface IPaintableConnection {
  setPaintStyle: (style: any) => void;
  setHoverPaintStyle: (style: any) => void;
}

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
  (node: IServiceNodeItem | IVolumeNodeItem) => void
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

  const getOverlayObject = (
    instance: BrowserJsPlumbInstance,
    isVolumeConnection = false
  ) => {
    return {
      type: "Label",
      options: {
        label: "x",
        location: 0.5,
        id: "remove-conn",
        cssClass: `
        block jtk-overlay ${
          isVolumeConnection ? "remove-conn-btn-volume" : "remove-conn-btn"
        } text-xs leading-normal cursor-pointer
        text-white font-bold rounded-full w-5 h-5 z-20 flex justify-center
        `,
        events: {
          click: (e: any) => {
            const connection = e?.overlay?.component as any;
            const activeInstance =
              instanceRef.current || connection?.instance || instance;

            if (
              activeInstance &&
              typeof (activeInstance as any).deleteConnection === "function"
            ) {
              (activeInstance as any).deleteConnection(connection);
            }
          }
        }
      }
    };
  };

  const isVolumeToServiceConnection = (
    sourceId: string,
    targetId: string
  ): boolean => {
    const sourceNode = stateRef.current?.[sourceId];
    const targetNode = stateRef.current?.[targetId];

    return sourceNode?.type === "VOLUME" && targetNode?.type === "SERVICE";
  };

  const applyConnectionStyle = (
    connection: IPaintableConnection,
    sourceId: string,
    targetId: string
  ) => {
    if (isVolumeToServiceConnection(sourceId, targetId)) {
      connection.setPaintStyle(volumeConnectionPaintStyle as any);
      connection.setHoverPaintStyle(volumeConnectionHoverStyle as any);
      return;
    }

    connection.setPaintStyle(defaultConnectionPaintStyle as any);
    connection.setHoverPaintStyle(defaultConnectionHoverStyle as any);
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
    const existingConnections = instance.select({
      source: params.sourceId as any,
      target: params.targetId as any
    });

    // prevent duplicates when switching existing connections
    if (existingConnections.length > 1) {
      return false;
    }

    if (existingConnections.length > 0) {
      const firstConnection = existingConnections.get(0);

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
        connections: getConnections(instance.getConnections({}, true) as any)
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

    (instance.getConnections({}, true) as Connection[]).forEach((conn) => {
      applyConnectionStyle(conn, conn.sourceId, conn.targetId);
    });

    connections.forEach((x) => {
      const c = currentConnectionUuids.find((y) => {
        return isEqual([`op_${x[0]}`, `ip_${x[1]}`], y);
      });

      if (!c) {
        const connection = instance.connect({
          uuids: [`op_${x[0]}`, `ip_${x[1]}`],
          overlays: [
            getOverlayObject(instance, isVolumeToServiceConnection(x[0], x[1]))
          ]
        });

        applyConnectionStyle(connection as Connection, x[0], x[1]);
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
      function (params: ConnectionDetachedParams) {
        onConnectionDetached([params.sourceId, params.targetId]);

        onGraphUpdate({
          nodes: stateRef.current,
          connections: getConnections(
            jsPlumbInstance.getConnections({}, true) as any
          )
        });
      }
    );

    jsPlumbInstance.bind(
      EVENT_CONNECTION,
      function (params: ConnectionEstablishedParams) {
        if (
          !Object.prototype.hasOwnProperty.call(
            params.connection.overlays,
            "remove-conn"
          )
        ) {
          params.connection.addOverlay(
            getOverlayObject(
              jsPlumbInstance,
              isVolumeToServiceConnection(params.sourceId, params.targetId)
            )
          );
          onConnectionAttached([params.sourceId, params.targetId]);
        }

        applyConnectionStyle(
          params.connection,
          params.sourceId,
          params.targetId
        );

        onGraphUpdate({
          nodes: stateRef.current,
          connections: getConnections(
            jsPlumbInstance.getConnections({}, true) as any
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

    setInstance(jsPlumbInstance);

    return () => {
      reset();
    };
  }, []);

  useEffect(() => {
    eventBus.on("GENERATE", () => {
      if (!instanceRef.current) return;

      if (stateRef.current) {
        onGraphUpdate({
          nodes: stateRef.current,
          connections: getConnections(
            instanceRef.current.getConnections({}, true) as any
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
