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
  dragOptions: {
    cursor: "move",
    filter: "button, a, input, [data-node-actions]"
  }
};

export const defaultConnectionStyle: PaintStyle = {
  strokeWidth: 2,
  stroke: "var(--muted-foreground)"
};

export const defaultConnectionHoverStyle: PaintStyle = {
  strokeWidth: 3,
  stroke: "var(--foreground)"
};

export const volumeConnectionStyle: PaintStyle = {
  strokeWidth: 2,
  dashstyle: "4 4",
  stroke: "var(--muted-foreground)"
};

export const volumeConnectionHoverStyle: PaintStyle = {
  strokeWidth: 3,
  stroke: "var(--foreground)"
};

const createSourceAnchor = (): AnchorSpec => [
  [1, 0.6, 1, 0],
  [0, 0.6, -1, 0],
  [0.6, 1, 0, 1],
  [0.6, 0, 0, -1]
];

const endpointHoverStyle: PaintStyle = {
  fill: "var(--foreground)",
  stroke: "var(--foreground)"
};

export const createSourceEndpoint = (uuid: string): EndpointOptions => ({
  uuid,
  anchor: createSourceAnchor(),
  endpoint: {
    type: DotEndpoint.type,
    options: { radius: 8 }
  },
  paintStyle: {
    stroke: "var(--foreground)",
    fill: "var(--muted-foreground)",
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
    stroke: "var(--foreground)",
    fill: "var(--muted-foreground)",
    strokeWidth: 1
  },
  hoverPaintStyle: endpointHoverStyle,
  maxConnections: -1,
  target: true
});
