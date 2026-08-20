import {
  AnchorSpec,
  BezierConnector,
  BrowserJsPlumbDefaults,
  DotEndpoint,
  EndpointOptions,
  PaintStyle
} from "@jsplumb/browser-ui";

export const jsPlumbDefaults: BrowserJsPlumbDefaults = {
  elementsDraggable: true,
  resizeObserver: true,
  dragOptions: { cursor: "move" }
};

export const defaultConnectionStyle: PaintStyle = {
  strokeWidth: 2,
  stroke: "#61b7cf"
};

export const defaultConnectionHoverStyle: PaintStyle = {
  strokeWidth: 3,
  stroke: "#216477"
};

export const volumeConnectionStyle: PaintStyle = {
  strokeWidth: 2,
  stroke: "#ad35ff"
};

export const volumeConnectionHoverStyle: PaintStyle = {
  strokeWidth: 3,
  stroke: "#7d0fc8"
};

const createSourceAnchor = (): AnchorSpec => [
  [1, 0.6, 1, 0],
  [0, 0.6, -1, 0],
  [0.6, 1, 0, 1],
  [0.6, 0, 0, -1]
];

const endpointHoverStyle: PaintStyle = {
  fill: "#216477",
  stroke: "#216477"
};

export const createSourceEndpoint = (uuid: string): EndpointOptions => ({
  uuid,
  anchor: createSourceAnchor(),
  endpoint: {
    type: DotEndpoint.type,
    options: { radius: 8 }
  },
  paintStyle: {
    stroke: "#097963",
    fill: "#16a085",
    strokeWidth: 1
  },
  source: true,
  connector: {
    type: BezierConnector.type,
    options: { curviness: 50 }
  },
  connectorStyle: { ...defaultConnectionStyle },
  hoverPaintStyle: endpointHoverStyle,
  connectorHoverStyle: { ...defaultConnectionHoverStyle },
  maxConnections: -1,
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

export const createTargetEndpoint = (uuid: string): EndpointOptions => ({
  uuid,
  anchor: "AutoDefault",
  endpoint: {
    type: DotEndpoint.type,
    options: { radius: 6 }
  },
  paintStyle: {
    stroke: "#7d0fc8",
    fill: "#ad35ff",
    strokeWidth: 1
  },
  hoverPaintStyle: endpointHoverStyle,
  maxConnections: -1,
  target: true
});
