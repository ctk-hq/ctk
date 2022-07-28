import { IGeneratePayload } from "../types";

export const generatePayload = (data: any): IGeneratePayload => {
  const nodes = data["nodes"];
  const networks = data["networks"] || {};
  const base: IGeneratePayload = {
    data: {
      version: 3,
      networks: {},
      services: {},
      volumes: {}
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
