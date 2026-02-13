import { Dictionary } from "lodash";
import {
  ensure,
  flattenLibraries,
  getClientNodeItem,
  iconByNodeType,
  attachUUID
} from "./index";
import { INetworkNodeItem, IServiceNodeItem, IVolumeNodeItem } from "../types";
import { nodeLibraries } from "./data/libraries";

type ComposeRecord = Record<string, unknown>;
type ComposeNodes = Dictionary<IServiceNodeItem | IVolumeNodeItem>;

interface IComposeGraphResult {
  version: string;
  nodes: ComposeNodes;
  connections: Array<[string, string]>;
  networks: Record<string, INetworkNodeItem>;
}

const COMPOSE_RESERVED_TOP_LEVEL_KEYS = new Set([
  "version",
  "services",
  "volumes",
  "networks",
  "configs",
  "secrets",
  "name"
]);

const isRecord = (value: unknown): value is ComposeRecord => {
  return Boolean(value) && value?.constructor === Object;
};

const toRecord = (value: unknown): ComposeRecord => {
  if (isRecord(value)) {
    return value;
  }

  return {};
};

const getDefaultNodePosition = (index: number) => {
  const columns = 3;
  const left = 100 + (index % columns) * 280;
  const top = 100 + Math.floor(index / columns) * 180;

  return { left, top };
};

const getDependsOnServiceNames = (dependsOn: unknown): string[] => {
  if (Array.isArray(dependsOn)) {
    return dependsOn.filter((item): item is string => typeof item === "string");
  }

  if (isRecord(dependsOn)) {
    return Object.keys(dependsOn);
  }

  return [];
};

const getVolumeMountSourceName = (mount: unknown): string | null => {
  if (typeof mount === "string") {
    const source = mount.split(":", 1)[0].trim();

    if (!source) {
      return null;
    }

    // Ignore bind mounts and host paths.
    if (
      source.startsWith("/") ||
      source.startsWith(".") ||
      source.startsWith("~") ||
      /^[a-zA-Z]:[\\/]/.test(source)
    ) {
      return null;
    }

    return source;
  }

  if (isRecord(mount) && typeof mount.source === "string") {
    const source = mount.source.trim();
    const mountType =
      typeof mount.type === "string" ? mount.type.toLowerCase() : "";

    if (!source) {
      return null;
    }

    // Long syntax can represent bind mounts as well.
    if (mountType && mountType !== "volume") {
      return null;
    }

    return source;
  }

  return null;
};

const getServiceVolumeNames = (volumes: unknown): string[] => {
  if (!Array.isArray(volumes)) {
    return [];
  }

  const names: string[] = [];
  volumes.forEach((mount) => {
    const sourceName = getVolumeMountSourceName(mount);
    if (sourceName && !names.includes(sourceName)) {
      names.push(sourceName);
    }
  });

  return names;
};

const getLegacyV1Services = (composeData: ComposeRecord): ComposeRecord => {
  const services: ComposeRecord = {};

  Object.entries(composeData).forEach(([key, value]) => {
    if (
      COMPOSE_RESERVED_TOP_LEVEL_KEYS.has(key) ||
      key.startsWith("x-") ||
      !isRecord(value)
    ) {
      return;
    }

    services[key] = value;
  });

  return services;
};

const normalizeVersion = (
  composeData: ComposeRecord,
  services: ComposeRecord
): string => {
  const versionValue = composeData.version;

  if (typeof versionValue === "number") {
    const major = Math.trunc(versionValue).toString();
    if (["1", "2", "3"].includes(major)) {
      return major;
    }
  }

  if (typeof versionValue === "string") {
    const normalized = versionValue.trim().toLowerCase();

    if (
      ["latest", "latest (spec)", "spec", "compose-spec"].includes(normalized)
    ) {
      return "latest";
    }

    const major = normalized.split(".")[0];
    if (["1", "2", "3"].includes(major)) {
      return major;
    }
  }

  // Legacy Compose v1 does not have top-level "version" and "services".
  if (
    !composeData.version &&
    !composeData.services &&
    Object.keys(services).length
  ) {
    return "1";
  }

  return "latest";
};

const getExistingServicesByName = (
  nodes: ComposeNodes
): Record<string, IServiceNodeItem> => {
  const map: Record<string, IServiceNodeItem> = {};

  Object.values(nodes).forEach((node) => {
    if (node.type === "SERVICE") {
      const serviceNode = node as IServiceNodeItem;
      const serviceName = serviceNode.canvasConfig.node_name;
      if (serviceName) {
        map[serviceName] = serviceNode;
      }
    }
  });

  return map;
};

const getExistingVolumesByName = (
  nodes: ComposeNodes
): Record<string, IVolumeNodeItem> => {
  const map: Record<string, IVolumeNodeItem> = {};

  Object.values(nodes).forEach((node) => {
    if (node.type === "VOLUME") {
      const volumeNode = node as IVolumeNodeItem;
      const volumeName =
        volumeNode.canvasConfig.node_name || volumeNode.volumeConfig.name;

      if (volumeName) {
        map[volumeName as string] = volumeNode;
      }
    }
  });

  return map;
};

const getExistingNetworksByName = (
  networks: Record<string, INetworkNodeItem>
): Record<string, INetworkNodeItem> => {
  const map: Record<string, INetworkNodeItem> = {};

  Object.values(networks).forEach((networkNode) => {
    const networkName = networkNode.canvasConfig.node_name;
    if (networkName) {
      map[networkName] = networkNode;
    }
  });

  return map;
};

export const composeToCanvasGraph = (
  composeInput: unknown,
  existingNodes: ComposeNodes = {},
  existingNetworks: Record<string, INetworkNodeItem> = {}
): IComposeGraphResult => {
  const composeData = toRecord(composeInput);
  const composeServices = composeData.services
    ? toRecord(composeData.services)
    : getLegacyV1Services(composeData);
  const composeVolumes = toRecord(composeData.volumes);
  const composeNetworks = toRecord(composeData.networks);
  const version = normalizeVersion(composeData, composeServices);

  const libraries = flattenLibraries(nodeLibraries);
  const serviceLibrary = ensure(libraries.find((l) => l.type === "SERVICE"));
  const volumeLibrary = ensure(libraries.find((l) => l.type === "VOLUME"));

  const existingServiceNodesByName = getExistingServicesByName(existingNodes);
  const existingVolumeNodesByName = getExistingVolumesByName(existingNodes);
  const existingNetworkNodesByName =
    getExistingNetworksByName(existingNetworks);

  const nextNodes: ComposeNodes = {};
  const serviceNodesByName: Record<string, IServiceNodeItem> = {};
  const volumeNodesByName: Record<string, IVolumeNodeItem> = {};
  let autoPositionIndex = 0;

  Object.entries(composeServices).forEach(([serviceName, rawConfig]) => {
    const existingNode = existingServiceNodesByName[serviceName];
    const node = {
      key: existingNode?.key ?? attachUUID("service"),
      type: "SERVICE",
      position:
        existingNode?.position ?? getDefaultNodePosition(autoPositionIndex++),
      inputs: existingNode?.inputs ?? [],
      outputs: existingNode?.outputs ?? [],
      canvasConfig: {
        node_name: serviceName,
        node_icon: existingNode?.canvasConfig.node_icon ?? ""
      },
      serviceConfig: toRecord(rawConfig)
    } as IServiceNodeItem;

    const clientNode = getClientNodeItem(
      node as IServiceNodeItem,
      serviceLibrary
    ) as IServiceNodeItem;

    serviceNodesByName[serviceName] = clientNode;
    nextNodes[clientNode.key] = clientNode;
  });

  Object.entries(composeVolumes).forEach(([volumeName, rawConfig]) => {
    const existingNode = existingVolumeNodesByName[volumeName];
    const nextVolumeConfig = {
      ...toRecord(rawConfig),
      name:
        (toRecord(rawConfig).name as string | undefined) ??
        existingNode?.volumeConfig.name ??
        volumeName
    };
    const node = {
      key: existingNode?.key ?? attachUUID("volume"),
      type: "VOLUME",
      position:
        existingNode?.position ?? getDefaultNodePosition(autoPositionIndex++),
      inputs: existingNode?.inputs ?? [],
      outputs: existingNode?.outputs ?? [],
      canvasConfig: {
        node_name: volumeName,
        node_icon:
          existingNode?.canvasConfig.node_icon ?? iconByNodeType.volume ?? ""
      },
      volumeConfig: nextVolumeConfig
    } as IVolumeNodeItem;

    const clientNode = getClientNodeItem(
      node as unknown as IServiceNodeItem,
      volumeLibrary
    ) as unknown as IVolumeNodeItem;

    volumeNodesByName[volumeName] = clientNode;
    nextNodes[clientNode.key] = clientNode;
  });

  const connections: Array<[string, string]> = [];
  const seenConnections = new Set<string>();

  const addConnection = (source: string, target: string) => {
    const connectionKey = `${source}->${target}`;
    if (seenConnections.has(connectionKey)) {
      return;
    }

    seenConnections.add(connectionKey);
    connections.push([source, target]);
  };

  Object.entries(serviceNodesByName).forEach(([serviceName, serviceNode]) => {
    const sourceService = serviceNodesByName[serviceName];
    const dependsOnNames = getDependsOnServiceNames(
      sourceService.serviceConfig.depends_on
    );

    dependsOnNames.forEach((dependsOnName) => {
      const targetService = serviceNodesByName[dependsOnName];
      if (targetService) {
        addConnection(sourceService.key, targetService.key);
      }
    });

    const volumeNames = getServiceVolumeNames(
      sourceService.serviceConfig.volumes
    );
    volumeNames.forEach((volumeName) => {
      const sourceVolume = volumeNodesByName[volumeName];
      if (sourceVolume) {
        addConnection(sourceVolume.key, serviceNode.key);
      }
    });
  });

  const nextNetworks: Record<string, INetworkNodeItem> = {};
  Object.entries(composeNetworks).forEach(([networkName, rawConfig]) => {
    const existingNode = existingNetworkNodesByName[networkName];
    const nextNetworkConfig = {
      ...toRecord(rawConfig),
      name:
        (toRecord(rawConfig).name as string | undefined) ??
        existingNode?.networkConfig.name ??
        networkName
    };

    const networkNode: INetworkNodeItem = {
      key: existingNode?.key ?? attachUUID("network"),
      type: "NETWORK",
      position: existingNode?.position ?? { left: 0, top: 0 },
      inputs: existingNode?.inputs ?? [],
      outputs: existingNode?.outputs ?? [],
      canvasConfig: {
        node_name: networkName,
        node_icon:
          existingNode?.canvasConfig.node_icon ?? iconByNodeType.network ?? ""
      },
      networkConfig: nextNetworkConfig
    };

    nextNetworks[networkNode.key] = networkNode;
  });

  return {
    version,
    nodes: nextNodes,
    connections,
    networks: nextNetworks
  };
};
