import { AnchorId } from "@jsplumb/common";
import { Dictionary } from "lodash";
import { NodeGroupType } from "./enums";

export interface IServiceNodePosition {
  key: string;
  position: {
    left: number;
    top: number;
  }
}

export interface IContainer {
  name: string;
  args?: string[];
  command?: string[];
  image: string;
  imagePullPolicy: string;
}

export interface INodeLibraryItem {
  Id: number;
  Name: string;
  Type: string;
  Description: string;
  NoInputs: number;
  NoOutputs: number;
  IsActive: boolean;
}

export interface INodeGroup {
  Id: number;
  Name: NodeGroupType;
  Description: string;
  NodeTypes: INodeLibraryItem[];
}

export interface IDockerCompose {
  version: string;
  services: any[];
}

interface INodeItem {
  key: string;
  type: string;
  position: { left: number; top: number };
  inputs: string[];
  outputs: string[];
}

export interface IFlatConnection {
  target: string;
}

export interface IBaseConfiguration {
  prettyName: string;
  name: string;
  description: string;
  type: string;
}

export interface IGraphData {
  nodes: IClientNodeItem[];
  connections: Dictionary<IFlatConnection>;
}

export interface IClientNodeItem extends INodeItem {
  outputs: string[];
  configuration: IBaseConfiguration;
}

export interface IServiceNodeItem extends INodeItem {
  configuration: IBaseConfiguration;
}

export interface IAnchor {
  id: string;
  position: AnchorId;
}

export interface IService {
  name: string;
  labels: {}
}

export interface IProjectPayload {
  name: string;
  data: {
    canvas: {
      position: {
        top: number;
        left: number;
        scale: number;
      };
      nodes: {};
      connections: any;
    };
    configs: [];
    networks: [];
    secrets: [];
    services: {};
    version: number;
    volumes: [];
  }
}

export interface IGeneratePayload {
  data: {
    configs: [];
    networks: [];
    secrets: [];
    services: IService[];
    connections: [[string, string]];
    version: number;
    volumes: [];
  }
}