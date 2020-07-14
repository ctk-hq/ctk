export interface ServiceBuildObject {
  context: string
  dockerfile: string
  args: []
  cache_from: []
  labels: []
  network: string
  shm_size: any
  target: string
}

export interface ServiceHealthCheck {
  test: []
  interval: string
  timeout: string
  retries: number
  start_period: string
}

export interface ServiceLogging {
  driver: string
  options: {
    'syslog-address': string
    'max-size': string
    'max-file': string
  }
}

export interface ServicePort {
  target: number
  published: number
  protocol: string
  mode: string
}

export interface KeyValuePair {
  key: string
  value: string
}

export interface ServiceDeploy {
  mode: string
  replicas: number
  labels: []
  update_config: {
    parallelism: number
    delay: string
    order: string
  }
  rollback_config: string
  restart_policy: {
    condition: string
    delay: string
    max_attempts: number
    window: string
  }
  endpoint_mode: string
  placement: {
    constraints: []
    preferences: []
  }
  max_replicas_per_node: number
  resources: {
    limits: {
      cpus: string
      memory: string
    }
    reservations: {
      cpus: string
      memory: string
    }
  }
}

export interface Service {
  user: string
  working_dir: string
  domainname: string
  hostname: string
  ipc: string
  mac_address: string
  privileged: boolean
  read_only: boolean
  shm_size: string
  stdin_open: boolean
  tty: boolean
  uuid: string
  name: string
  init: boolean
  isolation: string
  container_name?: string
  deploy: ServiceDeploy
  build: ServiceBuildObject
  image: string
  restart: string
  secrets: []
  ports: Array<{}>
  environment: Array<{}>
  links: []
  depends_on: any[]
  labels: []
  env_file: []
  cap_add: []
  cap_drop: []
  cgroup_parent: string
  command: []
  args: []
  configs: [] // from 3.3
  credential_spec: any // from 3.3 usage of config: from 3.8
  devices: []
  dns: []
  dns_search: []
  entrypoint: []
  expose: []
  external_links: []
  extra_hosts: []
  healthcheck: ServiceHealthCheck
  logging: ServiceLogging
  network_mode: string
  networks: [] // string or object
  volumes: Array<{}>,
  tag: string
}

export interface Volume {
  uuid: string
  name: string // mapped to "object name" in the final generated code
  volume_name?: string // mapped to "name" in the final generated code
  driver: string
  driver_opts: {
    "type": string
    o: string
    device: string
  }
  external: boolean,
  external_name: string,
  labels: KeyValuePair[]
}

export interface Network {
  uuid: string
  object_name: string
  name: string
  driver: string
  driver_custom: boolean
  type: string // hostnet or nonet
  driver_opts: KeyValuePair[]
  attachable: boolean
  enable_ipv6: boolean // 2 and below
  ipam: {
    driver: string
    config: [] // a list key/val pairs ex. subnet: 172.28.0.0/16
  }
  internal: boolean
  external: boolean,
  external_name: string,
  labels: KeyValuePair[]
}

export interface Secret {
  uuid: string
  object_name: string
  name: string // 3.5
  file: string
  external: boolean
}

export interface Config {
  uuid: string
  object_name: string
  data: any
}

export interface IPosition {
  uuid: string
  top: number
  left: number
  zoomLevel: number
}

export interface Project {
  uuid: string
  name: string
  mutable: boolean
  canvas: IPosition[]
  version: number
  volumes: Volume[]
  services: Service[]
  networks: Network[]
  secrets: Secret[]
  configs: Config[] // from 3.3
  id?: number
}

export interface RepoDetailsData {
  uuid: string
  name: string
  affiliation: null
  can_edit: boolean
  description: string
  full_description: string
  has_starred: boolean
  is_automated: boolean
  is_migrated: boolean
  is_private: boolean
  last_updated: string
  namespace: string
  permissions: {
    read: boolean
    write: boolean
    admin: boolean
  }
  pull_count: number
  repository_type: string
  star_count: number
  status: number
  user: string
}

export interface GlobalDialog {
  message: string,
  type: string
}

export interface User {
  username: string
  email: string
  pk: number
  first_name: string
  last_name: string
  token?: string
}

export interface GlobalAppConfiguration {
  mode: string
}

export interface ImportPayload {
  type: string,
  payload: string
}

export interface Recipe {
  name: string,
  keywords: string[],
  repo_url: string,
  docker_compose_file_raw_path: string,
  uuid?: string
}