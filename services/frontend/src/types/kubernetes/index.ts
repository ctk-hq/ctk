export interface IService {
  container_name: string;
}

export interface IGeneratePayload {
  data: {
    services: Record<string, Partial<IService>>;
  };
}

export interface IKubernetesProjectPayload {
  name: string;
  visibility: number;
  project_type: number;
  data: {
    canvas: {
      position: {
        top: number;
        left: number;
        scale: number;
      };
      nodes: any;
      connections: any;
    };
  };
}

export interface IEditServiceForm {
  serviceName: string;
}
