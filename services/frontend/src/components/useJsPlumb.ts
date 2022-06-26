import { useState, useEffect, useRef, useCallback } from "react";
import { AnchorId } from "@jsplumb/common";
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
  EVENT_DRAG_STOP,
  EVENT_CONNECTION_DBL_CLICK
} from "@jsplumb/browser-ui";
import {
  defaultOptions,
  inputAnchors,
  outputAnchors,
  sourceEndpoint,
  targetEndpoint
} from "../utils/options";
import { getConnections } from "../utils";
import { IClientNodeItem } from "../types";
import { Dictionary, isEqual } from "lodash";
import { IAnchor } from "../types";

export const useJsPlumb = (
  nodes: Dictionary<IClientNodeItem>,
  connections: Array<[string, string]>,
  onGraphUpdate: Function,
  onEndpointPositionUpdate: Function,
  onConnectionAttached: Function,
  onConnectionDetached: Function
): [(containerElement: HTMLDivElement) => void,
    (zoom: number) => void,
    (style: any) => void,
    (node: IClientNodeItem) => void] => {
  const [instance, setInstance] = useState<BrowserJsPlumbInstance>(null as any);
  const containerRef = useRef<HTMLDivElement>();
  const stateRef = useRef<Dictionary<IClientNodeItem>>();
  stateRef.current = nodes;
  const containerCallbackRef = useCallback((containerElement: HTMLDivElement) => {
    containerRef.current = containerElement; 
  }, []);

  const addEndpoints = useCallback((
    el: Element,
    sourceAnchors: IAnchor[],
    targetAnchors: IAnchor[],
    maxConnections: number
  ) => {
    sourceAnchors.forEach((x) => {
      let endpoint = sourceEndpoint;
      endpoint.maxConnections = maxConnections;

      // arrow overlay for connector to specify
      // it's dependency on another service
      instance.addEndpoint(el, endpoint, {
        anchor: [[0.4, 0, 0, -1], [1, 0.4, 1, 0], [0.4, 1, 0, 1], [0, 0.4, -1, 0]],
        uuid: x.id,
        connectorOverlays: [{
          type: "PlainArrow",
          options: {
            width: 16,
            length: 16,
            location: 1,
            id: "arrow"
          },
        }]
      })
    });

    targetAnchors.forEach((x) => {
      let endpoint = targetEndpoint;
      endpoint.maxConnections = maxConnections;

      instance.addEndpoint(el, endpoint, {
        anchor: [[0.6, 0, 0, -1], [1, 0.6, 1, 0], [0.6, 1, 0, 1], [0, 0.6, -1, 0]],
        uuid: x.id
      });
    });
  }, [instance]);

  const removeEndpoint = useCallback((node) => {
    const nodeConnections = instance.getConnections({ target: node.key });

    if (nodeConnections) {
      Object.values(nodeConnections).forEach((conn) => {
        instance.deleteConnection(conn);
      });
    };

    instance.removeAllEndpoints(document.getElementById(node.key) as Element);
  }, [instance]);

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
        location: .5,
        id: "remove-conn",
        cssClass: `
        block jtk-overlay remove-conn-btn text-xs leading-normal
        cursor-pointer text-white font-bold rounded-full w-5 h-5
        z-20 flex justify-center
        `,
        events: {
          click: (e: any) => {
            instance.deleteConnection(e.overlay.component as Connection);
          }
        }
      }
    }
  };

  const setZoom = useCallback((zoom: number) => {
    if (instance) {
      instance.setZoom(zoom);
    }
  }, [instance]);

  const setStyle = useCallback((style: any) => {
    let styles: { [key: string]: any } = {};
    const currentStyle = containerRef.current?.getAttribute("style");

    if (currentStyle) {
      let currentStyleParts = (
        currentStyle
          .split(";")
          .map(element => element.trim())
          .filter(element => element !== '')
      );

      for (let i = 0; i < currentStyleParts.length; i++) {
        const entry = currentStyleParts[i].split(':');
        styles[entry.splice(0, 1)[0]] = entry.join(':').trim();
      }
    }

    styles = {...styles, ...style};
    const styleString = (
      Object.entries(styles).map(([k, v]) => `${k}:${v}`).join(';')
    );

    containerRef.current?.setAttribute("style", `${styleString}`);
  }, []);

  const onbeforeDropIntercept = (instance: BrowserJsPlumbInstance, params: BeforeDropParams) => {
    const existingConnections: ConnectionSelection = instance.select({ source: params.sourceId as any, target: params.targetId as any });

    // prevent duplicates when switching existing connections
    if (existingConnections.length > 1) {
      return false;
    }

    if (existingConnections.length > 0) {
      const firstConnection: Connection = {...existingConnections.get(0)} as Connection;

      // special case to handle existing connections changing targets
      if (firstConnection.suspendedElementId) {
        onConnectionDetached([params.sourceId, firstConnection.suspendedElementId]);

        if (params.targetId !== firstConnection.suspendedElementId) {
          onConnectionAttached([params.sourceId, params.targetId]);
          return true;
        }
      }

      // prevent duplicate connections from the same source to target
      if (firstConnection.sourceId === params.sourceId && firstConnection.targetId === params.targetId) {
        return false;
      }
    }

    // prevent looping connections between a target and source
    const loopCheck = instance.select({ source: params.targetId as any, target: params.sourceId as any });
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
  }

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
        };
      });

      onGraphUpdate({
        'nodes': stateRef.current,
        'connections': getConnections(instance.getConnections({}, true) as Connection[])
      });
    }
  }, [instance, addEndpoints, onGraphUpdate]);

  useEffect(() => {
    if (!instance) return;

    let exisitngConnectionUuids = (instance.getConnections({}, true) as Connection[]).map(
      (x) => x.getUuids()
    );

    connections.forEach((x) => {
      let c = exisitngConnectionUuids.find((y) => {
        return isEqual([`op_${x[0]}`, `ip_${x[1]}`], y)
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

    jsPlumbInstance.bind(INTERCEPT_BEFORE_DROP, function (params: BeforeDropParams) {
      return onbeforeDropIntercept(jsPlumbInstance, params);
    });

    jsPlumbInstance.bind(EVENT_CONNECTION_DETACHED, function (this: BrowserJsPlumbInstance, params: ConnectionDetachedParams) {
      onConnectionDetached([params.sourceId, params.targetId]);

      onGraphUpdate({
        'nodes': stateRef.current,
        'connections': getConnections(this.getConnections({}, true) as Connection[])
      });
    });

    jsPlumbInstance.bind(EVENT_CONNECTION, function (this: BrowserJsPlumbInstance, params: ConnectionEstablishedParams) {
      if (!params.connection.overlays.hasOwnProperty("remove-conn")) {
        params.connection.addOverlay(getOverlayObject(this));
        onConnectionAttached([params.sourceId, params.targetId]);
      }

      onGraphUpdate({
        'nodes': stateRef.current,
        'connections': getConnections(this.getConnections({}, true) as Connection[])
      });
    });

    jsPlumbInstance.bind(EVENT_DRAG_STOP, (p: any) => {
      onEndpointPositionUpdate({
        key: p.el.id,
        position: {
          top: p.el.offsetTop,
          left: p.el.offsetLeft
        }
      });
    });

    jsPlumbInstance.bind(EVENT_CONNECTION_DBL_CLICK, (connection: Connection) => {
      jsPlumbInstance.deleteConnection(connection);
    });

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [containerCallbackRef, setZoom, setStyle, removeEndpoint];
}
