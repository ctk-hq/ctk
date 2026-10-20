import { IGeneratePayload } from "../types";

export const generatePayload = (payload: any): IGeneratePayload => {
  const nodes = payload["nodes"];
  const networks = payload["networks"] || {};
  const base: IGeneratePayload = {
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
    base.data.networks[networks[key].canvasConfig.node_name] =
      networks[key].networkConfig;
  });

  Object.keys(nodes).forEach((key) => {
    if (nodes[key].type === "SERVICE") {
      base.data.services[nodes[key].canvasConfig.node_name] =
        nodes[key].serviceConfig;
    }

    if (nodes[key].type === "VOLUME") {
      base.data.volumes[nodes[key].canvasConfig.node_name] =
        nodes[key].volumeConfig;
    }
  });

  return base;
};
