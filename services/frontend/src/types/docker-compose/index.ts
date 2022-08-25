import { KeyValuePair, INodeItem, ICanvasConfig } from "../index";

export interface IVolumeTopLevel {
  driver: string;
  driver_opts: {
    type: string;
    o: string;
    device: string;
  };
  external: boolean;
  labels?: string[] | KeyValuePair;
  name: string;
}

export interface IPAMConfig {
  subnet?: string;
  ip_range?: string;
  gateway?: string;
  aux_addresses?: Record<string, string>;
}

export interface IIPAM {
  driver?: string;
  config?: IPAMConfig[];
  options?: Record<string, string>;
}

export interface INetworkTopLevel {
  driver: string;
  driver_opts: KeyValuePair;
  attachable: boolean;
  enable_ipv6: boolean;
  ipam?: IIPAM;
  internal: boolean;
  labels?: string[] | KeyValuePair;
  external: boolean;
  name: string;
}

export interface IService {
  build?: {
    context: string;
    dockerfile?: string;
    args?: string[] | KeyValuePair;
    ssh?: string[];
    cache_from?: string[];
    cache_to?: string[];
    extra_hosts?: string[];
    isolation?: string;
    labels?: string[] | KeyValuePair;
    shm_size?: string | number;
    target?: string;
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
  credential_spec: KeyValuePair;
  depends_on:
    | string[]
    | {
        [key: string]: {
          condition: string;
        };
      };
  deploy?: {
    endpoint_mode?: "vip" | "dnsrr";
    labels?: string[] | KeyValuePair;
    mode?: "replicated" | "global";
    placement?: {
      constraints?: KeyValuePair[] | KeyValuePair;
      preferences?: KeyValuePair[] | KeyValuePair;
    };
    replicas?: number;
    resources?: {
      limits?: {
        cpus?: string;
        memory?: string;
        pids?: number;
      };
      reservations?: {
        cpus?: string;
        memory?: string;
        devices?: { [key: string]: string | number | string[] }[];
      };
    };
    restart_policy?: {
      condition?: "none" | "on-failure" | "any";
      delay?: string;
      max_attempts?: number;
      window?: string;
    };
    rollback_config?: {
      parallelism?: number;
      delay?: string;
      failure_action?: "continue" | "pause";
      monitor?: string;
      max_failure_ratio?: string;
      order?: "stop-first" | "start-first";
    };
    update_config?: {
      parallelism?: number;
      delay?: string;
      failure_action?: "continue" | "pause";
      monitor?: string;
      max_failure_ratio?: string;
      order?: "stop-first" | "start-first";
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
  environment: string[] | KeyValuePair;
  expose: string[];
  extends: KeyValuePair;
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
  labels: string[] | KeyValuePair;
  links: string[];
  logging: {
    driver: string;
    options: KeyValuePair;
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
  profiles?: string[];
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
  sysctls: string[] | KeyValuePair;
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

export interface IVolumeNodeItem extends INodeItem {
  outputs: string[];
  canvasConfig: ICanvasConfig;
  volumeConfig: Partial<IVolumeTopLevel>;
}

export interface INetworkNodeItem extends INodeItem {
  outputs: string[];
  canvasConfig: ICanvasConfig;
  networkConfig: Partial<INetworkTopLevel>;
}

export interface IProjectPayload {
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
  build: {
    context: string;
    dockerfile: string;
    arguments: {
      key: string[];
      value: string[];
    }[];
    sshAuthentications: {
      id: string;
      path: string;
    }[];
    cacheFrom: string[];
    cacheTo: string[];
    extraHosts: {
      hostName: string;
      ipAddress: string;
    }[];
    isolation: string;
    labels: {
      key: string[];
      value: string[];
    }[];
    sharedMemorySize: string;
    target: string;
  };
  command: string;
  deploy: {
    /**
     * The default value for `mode` is `replicated`. However, we allow
     * it to be empty. Thus, `mode` attribute can be pruned away
     * if the user never assigned `mode` explicitly.
     */
    mode: "" | "global" | "replicated";
    /**
     * The default value for `endpointMode` is platform dependent.
     */
    endpointMode: "" | "vip" | "dnsrr";
    replicas: string;
    placement: {
      constraints: {
        key: string;
        value: string;
      }[];
      preferences: {
        key: string;
        value: string;
      }[];
    };
    resources: {
      limits: {
        cpus: string;
        memory: string;
        pids: string;
      };
      reservations: {
        cpus: string;
        memory: string;
      };
    };
    restartPolicy: {
      /**
       * The default value for `condition` is `any`. However, we allow
       * it to be empty. Thus, `deploy` attribute can be pruned away
       * if the user never assigned `condition` explicitly.
       */
      condition: "" | "none" | "on-failure" | "any";
      delay: string;
      maxAttempts: string;
      window: string;
    };
    rollbackConfig: {
      parallelism: string;
      delay: string;
      failureAction: "" | "continue" | "pause";
      monitor: string;
      maxFailureRatio: string;
      order: "" | "stop-first" | "start-first";
    };
    updateConfig: {
      parallelism: string;
      delay: string;
      failureAction: "" | "continue" | "pause";
      monitor: string;
      maxFailureRatio: string;
      order: "" | "stop-first" | "start-first";
    };
    labels: {
      key: string;
      value: string;
    }[];
  };
  entrypoint: string;
  envFile: string;
  serviceName: string;
  imageName: string;
  imageTag: string;
  containerName: string;
  networks: string[];
  profiles: string[];
  ports: {
    hostPort: string;
    containerPort: string;
    protocol: "tcp" | "udp";
  }[];
  environmentVariables: {
    key: string;
    value: string;
  }[];
  restart: string;
  volumes: {
    name: string;
    containerPath: string;
    accessMode: string;
  }[];
  labels: {
    key: string;
    value: string;
  }[];
  dependsOn: string[];
  workingDir: string;
}

export interface IEditVolumeForm {
  entryName: string;
  volumeName: string;
  labels: {
    key: string;
    value: string;
  }[];
}

export interface IEditNetworkForm {
  entryName: string;
  networkName: string;
  driver: string;
  configurations: {
    subnet: string;
    ipRange: string;
    gateway: string;
    auxAddresses: {
      hostName: string;
      ipAddress: string;
    }[];
  }[];
  options: {
    key: string;
    value: string;
  }[];
  labels: {
    key: string;
    value: string;
  }[];
}
