import { useCallback, useLayoutEffect, useRef } from "react";
import {
  BeforeDropParams,
  BrowserJsPlumbInstance,
  Connection,
  ConnectionDetachedParams,
  ConnectionEstablishedParams,
  ConnectionMovedParams,
  DragMovePayload,
  DragStartPayload,
  DragStopPayload,
  EVENT_CONNECTION,
  EVENT_CONNECTION_DETACHED,
  EVENT_CONNECTION_DBL_CLICK,
  EVENT_CONNECTION_MOVED,
  EVENT_DRAG_MOVE,
  EVENT_DRAG_START,
  EVENT_DRAG_STOP,
  INTERCEPT_BEFORE_DROP,
  newInstance
} from "@jsplumb/browser-ui";

import { IServiceNodePosition } from "../../types";
import { CanvasConnection } from "./graphState";
import {
  createSourceEndpoint,
  createTargetEndpoint,
  defaultConnectionHoverStyle,
  defaultConnectionStyle,
  jsPlumbDefaults,
  volumeConnectionHoverStyle,
  volumeConnectionStyle
} from "./plumbing/config";
import {
  CanvasNode,
  CanvasNodeMap,
  ManagedNodeRegistry,
  synchronizeManagedNodes
} from "./plumbing/synchronizeNodes";

interface CanvasCallbacks {
  onConnectionAttached: (connection: CanvasConnection) => void;
  onConnectionDetached: (connection: CanvasConnection) => void;
  onDragStateChange: (nodeId: string | null) => void;
  onNodeUpdate: (position: IServiceNodePosition) => void;
}

export interface UseJsPlumbCanvasOptions extends CanvasCallbacks {
  connections: CanvasConnection[];
  nodes: CanvasNodeMap;
}

export interface UseJsPlumbCanvasResult {
  setContainer: (element: HTMLDivElement | null) => void;
  setZoom: (zoom: number) => void;
}

const useLatest = <T>(value: T) => {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
};

const connectionKey = ([sourceId, targetId]: CanvasConnection): string =>
  `${sourceId}::${targetId}`;

const connectionPair = (connection: Connection): CanvasConnection => [
  connection.sourceId,
  connection.targetId
];

export const useJsPlumbCanvas = ({
  connections,
  nodes,
  onConnectionAttached,
  onConnectionDetached,
  onDragStateChange,
  onNodeUpdate
}: UseJsPlumbCanvasOptions): UseJsPlumbCanvasResult => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<BrowserJsPlumbInstance | null>(null);
  const managedNodesRef = useRef<ManagedNodeRegistry>(new Map());
  const synchronizingRef = useRef(false);
  const nodesRef = useLatest(nodes);
  const callbacksRef = useLatest<CanvasCallbacks>({
    onConnectionAttached,
    onConnectionDetached,
    onDragStateChange,
    onNodeUpdate
  });

  const setContainer = useCallback((element: HTMLDivElement | null) => {
    containerRef.current = element;
  }, []);

  const isVolumeConnection = useCallback(
    (sourceId: string, targetId: string): boolean =>
      nodesRef.current[sourceId]?.type === "VOLUME" &&
      nodesRef.current[targetId]?.type === "SERVICE",
    [nodesRef]
  );

  const styleConnection = useCallback(
    (connection: Connection, sourceId: string, targetId: string) => {
      const volumeConnection = isVolumeConnection(sourceId, targetId);
      connection.setPaintStyle(
        volumeConnection ? volumeConnectionStyle : defaultConnectionStyle
      );
      connection.setHoverPaintStyle(
        volumeConnection
          ? volumeConnectionHoverStyle
          : defaultConnectionHoverStyle
      );
    },
    [isVolumeConnection]
  );

  const createRemoveOverlay = useCallback(
    (instance: BrowserJsPlumbInstance, volumeConnection: boolean) => ({
      type: "Label",
      options: {
        label: "×",
        location: 0.5,
        id: "remove-conn",
        cssClass: `block jtk-overlay ${
          volumeConnection ? "remove-conn-btn-volume" : "remove-conn-btn"
        } text-xs leading-normal cursor-pointer text-white font-bold rounded-full w-5 h-5 z-20 flex justify-center`,
        events: {
          click: (event: any) => {
            const connection = event?.overlay?.component as Connection;
            if (connection) instance.deleteConnection(connection);
          }
        }
      }
    }),
    []
  );

  const ensureConnectionPresentation = useCallback(
    (instance: BrowserJsPlumbInstance, connection: Connection) => {
      const [sourceId, targetId] = connectionPair(connection);
      if (!connection.getOverlay("remove-conn")) {
        connection.addOverlay(
          createRemoveOverlay(instance, isVolumeConnection(sourceId, targetId))
        );
      }
      styleConnection(connection, sourceId, targetId);
    },
    [createRemoveOverlay, isVolumeConnection, styleConnection]
  );

  const canDropConnection = useCallback(
    (instance: BrowserJsPlumbInstance, params: BeforeDropParams): boolean => {
      if (params.sourceId === params.targetId) return false;

      const currentConnections = instance.getConnections(
        {},
        true
      ) as Connection[];
      const conflicts = currentConnections.some(
        (connection) =>
          connection !== params.connection &&
          connection.sourceId === params.sourceId &&
          connection.targetId === params.targetId
      );
      if (conflicts) return false;

      return !currentConnections.some(
        (connection) =>
          connection !== params.connection &&
          connection.sourceId === params.targetId &&
          connection.targetId === params.sourceId
      );
    },
    []
  );

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Keep the instance local to this effect so Strict Mode cleanup always
    // destroys the exact instance it created.
    const instance = newInstance({
      ...jsPlumbDefaults,
      container
    });
    const managedNodes = managedNodesRef.current;
    instanceRef.current = instance;

    instance.bind(EVENT_DRAG_START, (params: DragStartPayload) => {
      instance.revalidate(params.el);
      callbacksRef.current.onDragStateChange(params.el.id);
    });

    instance.bind(EVENT_DRAG_MOVE, (params: DragMovePayload) => {
      instance.repaint(params.el);
    });

    instance.bind(EVENT_DRAG_STOP, (params: DragStopPayload) => {
      params.elements.forEach(({ el, id, pos }) => {
        instance.revalidate(el);
        callbacksRef.current.onNodeUpdate({
          key: id,
          position: { top: pos.y, left: pos.x }
        });
      });
      callbacksRef.current.onDragStateChange(null);
    });

    instance.bind(INTERCEPT_BEFORE_DROP, (params: BeforeDropParams) =>
      canDropConnection(instance, params)
    );

    instance.bind(
      EVENT_CONNECTION,
      (params: ConnectionEstablishedParams<Element>) => {
        ensureConnectionPresentation(instance, params.connection);
        if (!synchronizingRef.current) {
          callbacksRef.current.onConnectionAttached([
            params.sourceId,
            params.targetId
          ]);
        }
      }
    );

    instance.bind(
      EVENT_CONNECTION_DETACHED,
      (params: ConnectionDetachedParams<Element>) => {
        if (!synchronizingRef.current) {
          callbacksRef.current.onConnectionDetached([
            params.sourceId,
            params.targetId
          ]);
        }
      }
    );

    instance.bind(
      EVENT_CONNECTION_MOVED,
      (params: ConnectionMovedParams<Element>) => {
        ensureConnectionPresentation(instance, params.connection);
        if (!synchronizingRef.current) {
          callbacksRef.current.onConnectionDetached([
            params.originalSourceId,
            params.originalTargetId
          ]);
          callbacksRef.current.onConnectionAttached([
            params.newSourceId,
            params.newTargetId
          ]);
        }
      }
    );

    instance.bind(EVENT_CONNECTION_DBL_CLICK, (connection: Connection) => {
      instance.deleteConnection(connection);
    });

    return () => {
      instance.destroy();
      managedNodes.clear();
      if (instanceRef.current === instance) instanceRef.current = null;
    };
  }, [callbacksRef, canDropConnection, ensureConnectionPresentation]);

  useLayoutEffect(() => {
    const instance = instanceRef.current;
    const container = containerRef.current;
    if (!instance || !container) return;

    synchronizingRef.current = true;
    try {
      synchronizeManagedNodes({
        instance,
        container,
        managedNodes: managedNodesRef.current,
        nodes,
        addEndpoints: (element: Element, node: CanvasNode) => {
          node.outputs.forEach((uuid) =>
            instance.addEndpoint(element, createSourceEndpoint(uuid))
          );
          node.inputs.forEach((uuid) =>
            instance.addEndpoint(element, createTargetEndpoint(uuid))
          );
        }
      });
    } finally {
      synchronizingRef.current = false;
    }
  }, [nodes]);

  useLayoutEffect(() => {
    const instance = instanceRef.current;
    if (!instance) return;

    const expected = new Set(connections.map(connectionKey));
    const rendered = instance.getConnections({}, true) as Connection[];

    synchronizingRef.current = true;
    try {
      rendered.forEach((connection) => {
        if (!expected.has(connectionKey(connectionPair(connection)))) {
          instance.deleteConnection(connection);
        } else {
          ensureConnectionPresentation(instance, connection);
        }
      });

      const renderedKeys = new Set(
        (instance.getConnections({}, true) as Connection[]).map((connection) =>
          connectionKey(connectionPair(connection))
        )
      );

      connections.forEach(([sourceId, targetId]) => {
        if (renderedKeys.has(connectionKey([sourceId, targetId]))) return;
        const sourceUuid = nodes[sourceId]?.outputs[0];
        const targetUuid = nodes[targetId]?.inputs[0];
        if (!sourceUuid || !targetUuid) return;

        const connection = instance.connect({
          uuids: [sourceUuid, targetUuid],
          overlays: [
            createRemoveOverlay(
              instance,
              isVolumeConnection(sourceId, targetId)
            )
          ]
        }) as Connection;
        styleConnection(connection, sourceId, targetId);
      });

      instance.repaintEverything();
    } finally {
      synchronizingRef.current = false;
    }
  }, [
    connections,
    createRemoveOverlay,
    ensureConnectionPresentation,
    isVolumeConnection,
    nodes,
    styleConnection
  ]);

  const setZoom = useCallback((zoom: number) => {
    const instance = instanceRef.current;
    if (!instance) return;
    instance.setZoom(zoom);
    instance.repaintEverything();
  }, []);

  return { setContainer, setZoom };
};
