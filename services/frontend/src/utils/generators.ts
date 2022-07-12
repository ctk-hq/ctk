import {
  IServiceNodeItem,
  IGeneratePayload,
  ISaturatedService
} from "../types";
import { Dictionary } from "lodash";

const getServices = (
  graphNodes: Dictionary<IServiceNodeItem>
): ISaturatedService[] => {
  const ret: ISaturatedService[] = [];
  for (const [, value] of Object.entries(graphNodes)) {
    ret.push({
      ...value.canvasConfig,
      ...value.serviceConfig
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
