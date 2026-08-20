import { IServiceNodeItem } from "../../../types";
import {
  ManagedNodeRegistry,
  NodeManagementInstance,
  synchronizeManagedNodes
} from "./synchronizeNodes";

const serviceNode = (key: string): IServiceNodeItem =>
  ({
    key,
    type: "SERVICE",
    position: { left: 0, top: 0 },
    inputs: [`ip_${key}`],
    outputs: [`op_${key}`],
    canvasConfig: { node_name: key },
    serviceConfig: {}
  }) as unknown as IServiceNodeItem;

const createInstance = (
  elements: Map<string, Element>
): NodeManagementInstance => ({
  deleteConnectionsForElement: vi.fn(),
  getManagedElement: vi.fn((id) => elements.get(id) || null),
  manage: vi.fn(),
  removeAllEndpoints: vi.fn(),
  revalidate: vi.fn(),
  setDraggable: vi.fn(),
  unmanage: vi.fn()
});

test("manages and revalidates nodes added after the canvas starts", () => {
  const container = document.createElement("div");
  document.body.append(container);
  const elements = new Map<string, Element>();
  const managedNodes: ManagedNodeRegistry = new Map();
  const instance = createInstance(elements);
  const addEndpoints = vi.fn();

  const firstElement = document.createElement("div");
  firstElement.id = "first";
  container.append(firstElement);
  elements.set("first", firstElement);
  synchronizeManagedNodes({
    addEndpoints,
    container,
    instance,
    managedNodes,
    nodes: { first: serviceNode("first") }
  });

  const addedElement = document.createElement("div");
  addedElement.id = "added";
  container.append(addedElement);
  elements.set("added", addedElement);
  synchronizeManagedNodes({
    addEndpoints,
    container,
    instance,
    managedNodes,
    nodes: {
      first: serviceNode("first"),
      added: serviceNode("added")
    }
  });

  expect(instance.manage).toHaveBeenCalledWith(addedElement, "added", true);
  expect(instance.setDraggable).toHaveBeenCalledWith(addedElement, true);
  expect(addEndpoints).toHaveBeenCalledWith(addedElement, expect.any(Object));
  expect(instance.revalidate).toHaveBeenCalledWith(addedElement);
});

test("unmanages a deleted node and removes its jsPlumb artifacts", () => {
  const container = document.createElement("div");
  const element = document.createElement("div");
  element.id = "removed";
  container.append(element);
  document.body.append(container);
  const elements = new Map([["removed", element as Element]]);
  const instance = createInstance(elements);
  const managedNodes: ManagedNodeRegistry = new Map([
    ["removed", "ip_removed::op_removed"]
  ]);

  synchronizeManagedNodes({
    addEndpoints: vi.fn(),
    container,
    instance,
    managedNodes,
    nodes: {}
  });

  expect(instance.deleteConnectionsForElement).toHaveBeenCalledWith(element);
  expect(instance.removeAllEndpoints).toHaveBeenCalledWith(element);
  expect(instance.unmanage).toHaveBeenCalledWith(element, false);
  expect(managedNodes.has("removed")).toBe(false);
});
