import { Dictionary } from "lodash";

import { IServiceNodeItem, IVolumeNodeItem } from "../../../types";

export type CanvasNode = IServiceNodeItem | IVolumeNodeItem;
export type CanvasNodeMap = Dictionary<CanvasNode>;
export type ManagedNodeRegistry = Map<string, string>;

export interface NodeManagementInstance {
  deleteConnectionsForElement: (element: Element) => unknown;
  getManagedElement: (id: string) => Element | null;
  manage: (element: Element, internalId?: string, recalc?: boolean) => unknown;
  removeAllEndpoints: (element: Element) => unknown;
  revalidate: (element: Element) => unknown;
  setDraggable: (element: Element, draggable: boolean) => unknown;
  unmanage: (element: Element, removeElement?: boolean) => unknown;
}

const endpointSignature = (node: CanvasNode): string =>
  `${node.inputs.join("|")}::${node.outputs.join("|")}`;

export interface SynchronizeManagedNodesOptions {
  addEndpoints: (element: Element, node: CanvasNode) => void;
  container: Element;
  instance: NodeManagementInstance;
  managedNodes: ManagedNodeRegistry;
  nodes: CanvasNodeMap;
}

export const synchronizeManagedNodes = ({
  addEndpoints,
  container,
  instance,
  managedNodes,
  nodes
}: SynchronizeManagedNodesOptions): void => {
  const liveNodeIds = new Set(Object.keys(nodes));

  [...managedNodes.keys()].forEach((nodeId) => {
    if (liveNodeIds.has(nodeId)) return;

    const element = instance.getManagedElement(nodeId);
    if (element) {
      instance.deleteConnectionsForElement(element);
      instance.removeAllEndpoints(element);
      instance.unmanage(element, false);
    }
    managedNodes.delete(nodeId);
  });

  Object.values(nodes).forEach((node) => {
    const element = document.getElementById(node.key);
    if (!element || !container.contains(element)) return;

    const signature = endpointSignature(node);
    const previousSignature = managedNodes.get(node.key);

    if (!previousSignature) {
      instance.manage(element, node.key, true);
      instance.setDraggable(element, true);
      addEndpoints(element, node);
      managedNodes.set(node.key, signature);
    } else if (previousSignature !== signature) {
      instance.removeAllEndpoints(element);
      addEndpoints(element, node);
      managedNodes.set(node.key, signature);
    }

    // Recalculate every rendered node after React has committed its position.
    // This is essential for nodes introduced after the jsPlumb instance starts.
    instance.revalidate(element);
  });
};
