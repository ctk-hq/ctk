import { IGeneratePayload } from "../types";

export const flattenGraphData = (graphData: any): IGeneratePayload => {
  const nodes = graphData["nodes"];
  const base: IGeneratePayload = {
    data: {
      version: 3,
      networks: [],
      services: {},
      volumes: {}
    }
  };

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
