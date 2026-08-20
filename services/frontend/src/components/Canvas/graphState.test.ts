import { IServiceNodeItem, IVolumeNodeItem } from "../../types";
import {
  attachCanvasConnection,
  CanvasGraphState,
  detachCanvasConnection,
  removeCanvasNode,
  replaceCanvasNode
} from "./graphState";

const serviceNode = (
  key: string,
  name: string,
  serviceConfig: Record<string, unknown> = {}
): IServiceNodeItem =>
  ({
    key,
    type: "SERVICE",
    position: { left: 0, top: 0 },
    inputs: [`ip_${key}`],
    outputs: [`op_${key}`],
    canvasConfig: { node_name: name },
    serviceConfig
  }) as unknown as IServiceNodeItem;

const volumeNode = (key: string, name: string): IVolumeNodeItem =>
  ({
    key,
    type: "VOLUME",
    position: { left: 0, top: 0 },
    inputs: [],
    outputs: [`op_${key}`],
    canvasConfig: { node_name: name },
    volumeConfig: { name }
  }) as unknown as IVolumeNodeItem;

const initialState = (): CanvasGraphState => ({
  connections: [],
  nodes: {
    api: serviceNode("api", "api"),
    db: serviceNode("db", "db"),
    data: volumeNode("data", "data")
  }
});

test("attaching and detaching connections keeps Compose fields in sync", () => {
  const withDependency = attachCanvasConnection(initialState(), ["api", "db"]);
  const attached = attachCanvasConnection(withDependency, ["data", "api"]);

  expect(attached.connections).toEqual([
    ["api", "db"],
    ["data", "api"]
  ]);
  expect(
    (attached.nodes.api as IServiceNodeItem).serviceConfig.depends_on
  ).toEqual(["db"]);
  expect(
    (attached.nodes.api as IServiceNodeItem).serviceConfig.volumes
  ).toEqual(["data"]);

  const detached = detachCanvasConnection(attached, ["api", "db"]);
  expect(detached.connections).toEqual([["data", "api"]]);
  expect(
    (detached.nodes.api as IServiceNodeItem).serviceConfig.depends_on
  ).toBeUndefined();
});

test("removing a node removes its connections and related service config", () => {
  const attached = attachCanvasConnection(
    attachCanvasConnection(initialState(), ["api", "db"]),
    ["data", "api"]
  );
  const next = removeCanvasNode(attached, "data");

  expect(next.nodes.data).toBeUndefined();
  expect(next.connections).toEqual([["api", "db"]]);
  expect(
    (next.nodes.api as IServiceNodeItem).serviceConfig.volumes
  ).toBeUndefined();
});

test("editing a service rebuilds its visual dependency and volume links", () => {
  const state = attachCanvasConnection(initialState(), ["api", "db"]);
  const edited = serviceNode("api", "api", {
    depends_on: [],
    volumes: ["data:/var/lib/data"]
  });
  const next = replaceCanvasNode(state, edited);

  expect(next.connections).toEqual([["data", "api"]]);
});
