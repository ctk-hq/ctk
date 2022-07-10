import { IClientNodeItem, IService, IGeneratePayload } from "../types";
import { Dictionary } from "lodash";

const getServices = (graphNodes: Dictionary<IClientNodeItem>): IService[] => {
  const ret: IService[] = [];
  for (const [, value] of Object.entries(graphNodes)) {
    ret.push({
      name: value.configuration.name,
      labels: {
        key: value.key
      }
    });
  }

  return ret;
};

export const flattenGraphData = (graphData: any): IGeneratePayload => {
  const nodes = graphData["nodes"];
  const base: IGeneratePayload = {
    data: {
      version: 3,
      configs: [],
      networks: [],
      secrets: [],
      services: [],
      connections: graphData["connections"],
      volumes: []
    }
  };

  getServices(nodes).forEach((x) => {
    base.data.services.push(x);
  });

  return base;
};
