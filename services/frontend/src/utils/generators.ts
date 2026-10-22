import { IGeneratePayload } from "../types";

export const generatePayload = (payload: any): IGeneratePayload => {
  const nodes = payload["nodes"];
  const networks = payload["networks"] || {};
  const base: IGeneratePayload = {
    graphErrors: [],
    kubernetesStorage: {},
    kubernetesServices: {},
    manifestSource: payload.manifestSource,
    nodeNames: Object.fromEntries(
      Object.values(
        nodes as Record<
          string,
          { key: string; canvasConfig: { node_name: string } }
        >
      ).map((node) => [node.key, node.canvasConfig.node_name])
    ),
    data: {
      networks: Object.create(null),
      services: Object.create(null),
      volumes: Object.create(null)
    }
  };

  Object.keys(networks).forEach((key) => {
    if (Object.hasOwn(base.data.networks, networks[key].canvasConfig.node_name))
      base.graphErrors!.push(
        `Duplicate network name: ${networks[key].canvasConfig.node_name}`
      );
    base.data.networks[networks[key].canvasConfig.node_name] =
      networks[key].networkConfig;
  });

  Object.keys(nodes).forEach((key) => {
    if (nodes[key].type === "SERVICE") {
      if (Object.hasOwn(base.data.services, nodes[key].canvasConfig.node_name))
        base.graphErrors!.push(
          `Duplicate service name: ${nodes[key].canvasConfig.node_name}`
        );
      base.data.services[nodes[key].canvasConfig.node_name] =
        nodes[key].serviceConfig;
      if (nodes[key].kubernetes?.service)
        base.kubernetesServices![nodes[key].canvasConfig.node_name] =
          nodes[key].kubernetes.service;
    }

    if (nodes[key].type === "VOLUME") {
      if (Object.hasOwn(base.data.volumes, nodes[key].canvasConfig.node_name))
        base.graphErrors!.push(
          `Duplicate volume name: ${nodes[key].canvasConfig.node_name}`
        );
      if (nodes[key].kubernetes)
        base.kubernetesStorage![nodes[key].canvasConfig.node_name] =
          nodes[key].kubernetes;
      base.data.volumes[nodes[key].canvasConfig.node_name] =
        nodes[key].volumeConfig;
    }
  });

  return base;
};
