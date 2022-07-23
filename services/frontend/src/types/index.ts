import { AnchorId } from "@jsplumb/common";
import { Dictionary } from "lodash";
import { KeyValuePair } from "tailwindcss/types/config";
import { NodeGroupType } from "./enums";

type KeyValPair = {
  [x: string]: string | number;
};

export type CallbackFunction = (...args: any[]) => any;

export interface IServiceNodePosition {
  key: string;
  position: {
    left: number;
    top: number;
  };
}

export interface IProject {
  id: number;
  name: string;
  uuid: string;
  data: string;
  created_at: string;
  modified_at: string;
}

export interface INodeLibraryItem {
  id: number;
  name: string;
  type: string;
  description: string;
  noInputs: number;
  noOutputs: number;
  isActive: boolean;
}

export interface INodeGroup {
  id: number;
  name: NodeGroupType;
  description: string;
  nodeTypes: INodeLibraryItem[];
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

export interface ICanvasConfig {
  node_name?: string;
  node_icon?: string;
}

export interface IGraphData {
  nodes: IServiceNodeItem[];
  connections: Dictionary<IFlatConnection>;
}

export interface IAnchor {
  id: string;
  position: AnchorId;
}

export interface IVolumeTopLevel {
  driver: string;
  driver_opts: {
    type: string;
    o: string;
    device: string;
  };
  external: boolean;
  labels: string[] | KeyValuePair;
  name: string;
}

export interface INetworkTopLevel {
  driver: string;
  driver_opts: KeyValPair;
  attachable: boolean;
  enable_ipv6: boolean;
  ipam: {
    driver: string;
    config: {
      subnet: string;
      ip_range: string;
      gateway: string;
      aux_addresses: {
        host1: string;
        host2: string;
        host3: string;
      };
    }[];
    options: KeyValPair;
  };
  internal: boolean;
  labels: string[] | KeyValPair;
  external: boolean;
  name: string;
}

export interface IService {
  build: {
    context: string;
    dockerfile: string;
    args: KeyValPair[];
    ssh: string[];
    cache_from: string[];
    cache_to: string[];
    extra_hosts: string[];
    isolation: string;
    labels: KeyValPair[];
    shm_size: string | number;
    target: string;
  };
  cpu_count: string | number;
  cpu_percent: string | number;
  cpu_shares: string | number;
  cpu_period: string | number;
  cpu_quota: string | number;
  cpu_rt_runtime: string | number;
  cpu_rt_period: string | number;
  cpuset: number | number[];
  cap_add: string[];
  cap_drop: string[];
  cgroup_parent: string;
  command: string | string[];
  configs:
    | string[]
    | {
        [x: string]: {
          source: string;
          target: string;
          uid: string;
          gid: string;
          mode: number;
        };
      };
  container_name: string;
  credential_spec: KeyValPair;
  depends_on:
    | string[]
    | {
        [key: string]: {
          condition: string;
        };
      };
  deploy: {
    endpoint_mode: string;
    labels: string[] | { [key: string]: string };
    mode: string;
    placement: {
      constraints: KeyValPair[] | KeyValPair;
      preferences: KeyValPair[] | KeyValPair;
    };
    replicas: number;
    resources: {
      limits: {
        cpus: string;
        memory: string;
        pids: number;
      };
      reservations: {
        cpus: string;
        memory: string;
        devices: { [key: string]: string | number | string[] }[];
      };
    };
    restart_policy: {
      condition: string;
      delay: string;
      max_attempts: number;
      window: string;
    };
    rollback_config: {
      parallelism: number;
      delay: string;
      failure_action: string;
      monitor: string;
      max_failure_ratio: string;
      order: string;
    };
    update_config: {
      parallelism: number;
      delay: string;
      failure_action: string;
      monitor: string;
      max_failure_ratio: string;
      order: string;
    };
  };
  device_cgroup_rules: string[];
  devices: string[];
  dns: string | string[];
  dns_opt: string[];
  dns_search: string | string[];
  domainname: string;
  entrypoint: string | string[];
  env_file: string | string[];
  environment: string[] | KeyValPair;
  expose: string[];
  extends: KeyValPair;
  external_links: string[];
  extra_hosts: string[];
  group_add: string[];
  healthcheck: {
    test: string[];
    interval: string;
    timeout: string;
    retries: number;
    start_period: string;
  };
  hostname: string;
  image: string;
  init: boolean;
  ipc: string;
  isolation: string;
  labels: string[] | KeyValPair;
  links: string[];
  logging: {
    driver: string;
    options: KeyValPair;
  };
  network_mode: string;
  networks:
    | string[]
    | {
        [x: string]: {
          aliases: string[];
          ipv4_address: string;
          ipv6_address: string;
          link_local_ips: string[];
          priority: number;
        };
      };
  mac_address: string;
  mem_swappiness: number;
  memswap_limit: string | number;
  oom_kill_disable: boolean;
  oom_score_adj: number;
  pid: string | number;
  platform: string;
  ports:
    | string[]
    | {
        target: number;
        host_ip: string;
        published: string | number;
        protocol: string;
        mode: string;
      };
  privileged: boolean;
  profiles: string;
  pull_policy: string;
  read_only: boolean;
  restart: string;
  runtime: string;
  secrets:
    | string[]
    | {
        source: string;
        target: string;
        uid: string;
        gid: string;
        mode: number;
      };
  security_opt: string[];
  shm_size: string;
  stdin_open: boolean;
  stop_grace_period: string;
  stop_signal: string;
  storage_opt: {
    size: string;
  };
  sysctls: string[] | KeyValPair;
  tmpfs: string | string[];
  tty: boolean;
  ulimits: {
    nproc: number;
    nofile: {
      soft: number;
      hard: number;
    };
  };
  user: string;
  userns_mode: string;
  volumes:
    | string[]
    | {
        type: string;
        source: string;
        target: string;
        read_only: boolean;
        bind: {
          propagation: string;
          create_host_path: boolean;
          selinux: string;
        };
        volume: {
          nocopy: boolean;
        };
        tmpfs: {
          size: string | number;
        };
        consistency: string;
      };
  volumes_from: string[];
  working_dir: string;
}

export interface IServiceNodeItem extends INodeItem {
  outputs: string[];
  canvasConfig: ICanvasConfig;
  serviceConfig: Partial<IService>;
}

export interface IVolumeNodeItem extends INodeItem {
  outputs: string[];
  canvasConfig: ICanvasConfig;
  volumeConfig: Partial<IVolumeTopLevel>;
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
      nodes: any;
      connections: any;
      networks: any;
    };
  };
}

export interface IGeneratePayload {
  data: {
    version: number;
    networks: Record<string, Partial<INetworkTopLevel>>;
    services: Record<string, Partial<IService>>;
    volumes: Record<string, Partial<IVolumeTopLevel>>;
  };
}

export interface IEditServiceForm {
  serviceName: string;
  containerName: string;
  ports: {
    hostPort: string;
    containerPort: string;
    protocol: "tcp" | "udp";
  }[];
  environmentVariables: {
    key: string;
    value: string;
  }[];
  volumes: {
    name: string;
    containerPath: string;
    accessMode: string;
  }[];
  labels: {
    key: string;
    value: string;
  }[];
}
