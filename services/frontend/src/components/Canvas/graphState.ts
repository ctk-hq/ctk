import { IServiceNodeItem, IVolumeNodeItem } from "../../types";
import { CanvasNodeMap } from "./plumbing/synchronizeNodes";

export type CanvasConnection = [string, string];

export interface CanvasGraphState {
  connections: CanvasConnection[];
  nodes: CanvasNodeMap;
}

const sameConnection = (
  left: CanvasConnection,
  right: CanvasConnection
): boolean => left[0] === right[0] && left[1] === right[1];

const dependsOnNames = (dependsOn: unknown): string[] => {
  if (Array.isArray(dependsOn)) {
    return dependsOn.filter((name): name is string => typeof name === "string");
  }

  if (dependsOn && dependsOn.constructor === Object) {
    return Object.keys(dependsOn);
  }

  return [];
};

const volumeNodeName = (node: IVolumeNodeItem | undefined): string =>
  String(node?.canvasConfig.node_name || node?.volumeConfig.name || "");

const volumeMountSource = (mount: unknown): string | null => {
  if (typeof mount === "string") {
    const source = mount.split(":", 1)[0].trim();
    return source || null;
  }

  if (
    mount &&
    mount.constructor === Object &&
    typeof (mount as { source?: unknown }).source === "string"
  ) {
    return (mount as { source: string }).source.trim() || null;
  }

  return null;
};

const volumeMountNames = (volumes: unknown): string[] => {
  if (!Array.isArray(volumes)) return [];

  return volumes.reduce<string[]>((names, mount) => {
    const source = volumeMountSource(mount);
    if (source && !names.includes(source)) names.push(source);
    return names;
  }, []);
};

const withoutVolumeMount = (volumes: unknown, volumeName: string): unknown[] =>
  Array.isArray(volumes)
    ? volumes.filter((mount) => volumeMountSource(mount) !== volumeName)
    : [];

export const attachCanvasConnection = (
  state: CanvasGraphState,
  connection: CanvasConnection
): CanvasGraphState => {
  if (
    state.connections.some((current) => sameConnection(current, connection))
  ) {
    return state;
  }

  const [sourceId, targetId] = connection;
  const sourceNode = state.nodes[sourceId];
  const targetNode = state.nodes[targetId];
  const nodes = { ...state.nodes };

  if (sourceNode?.type === "SERVICE" && targetNode?.type === "SERVICE") {
    const sourceService = sourceNode as IServiceNodeItem;
    const targetName = targetNode.canvasConfig.node_name;
    const currentDependsOn = sourceService.serviceConfig.depends_on;

    if (targetName && !dependsOnNames(currentDependsOn).includes(targetName)) {
      const nextDependsOn = Array.isArray(currentDependsOn)
        ? [...currentDependsOn, targetName]
        : currentDependsOn && currentDependsOn.constructor === Object
          ? {
              ...currentDependsOn,
              [targetName]: { condition: "service_healthy" as const }
            }
          : [targetName];

      nodes[sourceId] = {
        ...sourceService,
        serviceConfig: {
          ...sourceService.serviceConfig,
          depends_on: nextDependsOn
        }
      };
    }
  }

  if (sourceNode?.type === "VOLUME" && targetNode?.type === "SERVICE") {
    const sourceName = volumeNodeName(sourceNode as IVolumeNodeItem);
    const targetService = targetNode as IServiceNodeItem;
    const currentVolumes = Array.isArray(targetService.serviceConfig.volumes)
      ? [...targetService.serviceConfig.volumes]
      : [];

    if (sourceName && !volumeMountNames(currentVolumes).includes(sourceName)) {
      nodes[targetId] = {
        ...targetService,
        serviceConfig: {
          ...targetService.serviceConfig,
          volumes: [...currentVolumes, sourceName]
        }
      };
    }
  }

  return {
    nodes,
    connections: [...state.connections, connection]
  };
};

export const detachCanvasConnection = (
  state: CanvasGraphState,
  connection: CanvasConnection
): CanvasGraphState => {
  if (
    !state.connections.some((current) => sameConnection(current, connection))
  ) {
    return state;
  }

  const [sourceId, targetId] = connection;
  const sourceNode = state.nodes[sourceId];
  const targetNode = state.nodes[targetId];
  const nodes = { ...state.nodes };

  if (sourceNode?.type === "SERVICE" && targetNode?.type === "SERVICE") {
    const sourceService = sourceNode as IServiceNodeItem;
    const targetName = targetNode.canvasConfig.node_name;
    const currentDependsOn = sourceService.serviceConfig.depends_on;

    if (targetName && dependsOnNames(currentDependsOn).includes(targetName)) {
      const nextDependsOn = Array.isArray(currentDependsOn)
        ? currentDependsOn.filter((name) => name !== targetName)
        : Object.fromEntries(
            Object.entries(currentDependsOn || {}).filter(
              ([name]) => name !== targetName
            )
          );
      const serviceConfig = { ...sourceService.serviceConfig };

      if (dependsOnNames(nextDependsOn).length > 0) {
        serviceConfig.depends_on = nextDependsOn;
      } else {
        delete serviceConfig.depends_on;
      }

      nodes[sourceId] = { ...sourceService, serviceConfig };
    }
  }

  if (sourceNode?.type === "VOLUME" && targetNode?.type === "SERVICE") {
    const sourceName = volumeNodeName(sourceNode as IVolumeNodeItem);
    const targetService = targetNode as IServiceNodeItem;
    const currentVolumes = targetService.serviceConfig.volumes;
    const nextVolumes = withoutVolumeMount(currentVolumes, sourceName);

    if (
      sourceName &&
      Array.isArray(currentVolumes) &&
      nextVolumes.length !== currentVolumes.length
    ) {
      const serviceConfig = { ...targetService.serviceConfig };
      if (nextVolumes.length > 0) {
        serviceConfig.volumes =
          nextVolumes as IServiceNodeItem["serviceConfig"]["volumes"];
      } else {
        delete serviceConfig.volumes;
      }
      nodes[targetId] = { ...targetService, serviceConfig };
    }
  }

  return {
    nodes,
    connections: state.connections.filter(
      (current) => !sameConnection(current, connection)
    )
  };
};

export const removeCanvasNode = (
  state: CanvasGraphState,
  nodeId: string
): CanvasGraphState => {
  const connected = state.connections.filter(
    ([sourceId, targetId]) => sourceId === nodeId || targetId === nodeId
  );
  const detached = connected.reduce(detachCanvasConnection, state);
  const nodes = { ...detached.nodes };
  delete nodes[nodeId];

  return { nodes, connections: detached.connections };
};

export const replaceCanvasNode = (
  state: CanvasGraphState,
  node: IServiceNodeItem | IVolumeNodeItem
): CanvasGraphState => {
  const nodes = { ...state.nodes, [node.key]: node };
  if (node.type !== "SERVICE") return { ...state, nodes };

  const service = node as IServiceNodeItem;
  const connections = state.connections.filter(
    ([sourceId, targetId]) =>
      sourceId !== node.key &&
      !(targetId === node.key && nodes[sourceId]?.type === "VOLUME")
  );

  dependsOnNames(service.serviceConfig.depends_on).forEach((dependencyName) => {
    const targetId = Object.keys(nodes).find(
      (nodeId) =>
        nodes[nodeId]?.type === "SERVICE" &&
        nodes[nodeId]?.canvasConfig.node_name === dependencyName
    );
    if (targetId) connections.push([node.key, targetId]);
  });

  volumeMountNames(service.serviceConfig.volumes).forEach((mountName) => {
    const sourceId = Object.keys(nodes).find(
      (nodeId) =>
        nodes[nodeId]?.type === "VOLUME" &&
        volumeNodeName(nodes[nodeId] as IVolumeNodeItem) === mountName
    );
    if (sourceId) connections.push([sourceId, node.key]);
  });

  return { nodes, connections };
};
