export type PortProtocol = "TCP" | "UDP" | "SCTP";

export interface KubernetesServicePort {
  name?: string;
  port: number;
  targetPort: number | string;
  protocol: PortProtocol;
  nodePort?: number;
  appProtocol?: string;
}

/** Target-specific settings; never serialized as Compose host bindings. */
export interface KubernetesServiceConfig {
  type: "None" | "ClusterIP" | "NodePort" | "LoadBalancer";
  ports: KubernetesServicePort[];
}

export interface ServiceNetworking {
  native?: boolean;
  service?: KubernetesServiceConfig;
  serviceNotice?: string;
}

export interface KubernetesServiceBinding {
  documentIndex?: number;
  config: KubernetesServiceConfig;
}

export interface ServiceExposureForm {
  native: boolean;
  type: "" | KubernetesServiceConfig["type"];
  notice: string;
  ports: {
    _sourceIndex?: number;
    name: string;
    servicePort: string;
    targetPort: string;
    protocol: PortProtocol;
    nodePort: string;
    appProtocol: string;
  }[];
}
