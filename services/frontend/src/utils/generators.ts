import { IGeneratePayload, IGenerateKubernetesPayload } from "../types";

export const generatePayload = (payload: any): IGeneratePayload => {
  const nodes = payload["nodes"];
  const networks = payload["networks"] || {};
  const base: IGeneratePayload = {
    data: {
      version: payload["version"],
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

export const generateKubernetesPayload = (
  payload: any
): IGenerateKubernetesPayload => {
  const nodes = payload["nodes"];
  const base: IGenerateKubernetesPayload = {
    data: {
      services: {}
    }
  };

  Object.keys(nodes).forEach((key) => {
    if (nodes[key].type === "SERVICE") {
      base.data.services[nodes[key].canvasConfig.node_name] =
        nodes[key].serviceConfig;
    }
  });

  return base;
};
