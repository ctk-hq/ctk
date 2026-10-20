import YAML from "yaml";
import { manifestTypes } from "../constants";
import type {
  IServiceNodeItem,
  IVolumeNodeItem,
  INetworkNodeItem,
  IGeneratePayload
} from "../types";
import { generateManifest } from "./generate";
import { parseManifest } from "../utils/manifests";
import { composeToCanvasGraph } from "../utils/compose";
import { generatePayload } from "../utils/generators";
import {
  getInitialValues,
  getFinalValues,
  validationSchema
} from "../components/modals/docker-compose/service/form-utils";
import * as volumeForm from "../components/modals/docker-compose/volume/form-utils";
import * as networkForm from "../components/modals/docker-compose/network/form-utils";
import {
  attachCanvasConnection,
  replaceCanvasNode,
  removeCanvasNode
} from "../components/Canvas/graphState";
import { preserveComposeSettings } from "../utils/manifest-reconciliation";

const compose = (
  services: any,
  volumes = {},
  networks = {}
): IGeneratePayload => ({ data: { services, volumes, networks } });
const kube = (payload: IGeneratePayload) =>
  generateManifest(payload, manifestTypes.KUBERNETES);
const documents = (payload: IGeneratePayload) => {
  const result = kube(payload);
  expect(result.error).toBeUndefined();
  return YAML.parseAllDocuments(result.code).map((document) =>
    document.toJSON()
  );
};
const service = (config: any): IServiceNodeItem =>
  Object.values(
    composeToCanvasGraph({ services: { web: config } }).nodes
  )[0] as IServiceNodeItem;
const deployment = (containers: any[] = [{ name: "app", image: "nginx" }]) => ({
  apiVersion: "apps/v1",
  kind: "Deployment",
  metadata: { name: "web", namespace: "demo" },
  spec: {
    replicas: 1,
    selector: { matchLabels: { app: "web" } },
    template: { metadata: { labels: { app: "web" } }, spec: { containers } }
  }
});
const native = (resources: any[]): IGeneratePayload => {
  const imported = parseManifest(JSON.stringify(resources), "json");
  return { data: imported.data, manifestSource: imported.source };
};

test("nested form edits preserve opaque build, deployment and dependency settings", () => {
  const node = service({
    image: "nginx",
    build: {
      context: ".",
      additional_contexts: { shared: "../shared" },
      args: { KEEP: "yes", EDIT: "before" }
    },
    deploy: {
      resources: {
        limits: { memory: "256m", pids: 50 },
        reservations: { devices: [{ capabilities: ["gpu"] }] }
      },
      restart_policy: { condition: "any", window: "30s", "x-extra": true }
    },
    depends_on: {
      db: { condition: "service_healthy", required: false, restart: true }
    }
  });
  const values = getInitialValues(node);
  values.build.arguments[1].value = "after" as any;
  values.deploy.resources.limits.memory = "512m";
  values.dependsOn[0].condition = "service_started";
  const saved = getFinalValues(values, node).serviceConfig as any;
  expect(saved.build.additional_contexts).toEqual({ shared: "../shared" });
  expect(saved.build.args).toEqual({ KEEP: "yes", EDIT: "after" });
  expect(saved.deploy.resources.reservations.devices).toEqual([
    { capabilities: ["gpu"] }
  ]);
  expect(saved.deploy.restart_policy["x-extra"]).toBe(true);
  // Long dependency options remain represented when changing a condition.
  expect(saved.depends_on.db).toEqual({
    condition: "service_started",
    required: false,
    restart: true
  });
});

test("editing and reordering long ports and mounts retains per-item native options", () => {
  const node = service({
    image: "nginx",
    ports: [
      { target: 80, published: "8080", host_ip: "127.0.0.1" },
      { target: 90, published: "9090", mode: "host" }
    ],
    volumes: [
      { type: "volume", source: "a", target: "/a", volume: { nocopy: true } },
      { type: "volume", source: "b", target: "/b", volume: { subpath: "logs" } }
    ]
  });
  const values = getInitialValues(node);
  values.ports.reverse();
  values.ports[0].hostPort = "9191";
  values.volumes.shift();
  values.volumes[0].containerPath = "/logs";
  const saved = getFinalValues(values, node).serviceConfig as any;
  expect(saved.ports[0]).toEqual({
    target: 90,
    published: "9191",
    mode: "host"
  });
  expect(saved.ports[1]).toEqual({
    target: 80,
    published: "8080",
    host_ip: "127.0.0.1"
  });
  expect(saved.volumes).toEqual([
    {
      type: "volume",
      source: "b",
      target: "/logs",
      volume: { subpath: "logs" }
    }
  ]);
});

test("short build, env-file objects, network dictionaries and list labels reopen and preserve edits", () => {
  const node = service({
    image: "nginx",
    build: "./image",
    env_file: [
      { path: "./base.env", required: false, format: "raw" },
      "./dev.env"
    ],
    networks: { private: { aliases: ["api"] }, public: null },
    labels: ["keep=yes", "edit=before"]
  });
  const values = getInitialValues(node);
  expect(values.build.context).toBe("./image");
  expect(values.envFile).toBe("./base.env\n./dev.env");
  values.envFile = "./base.env\n./other.env";
  values.networks = ["private", "new"];
  values.labels[1].value = "after";
  const saved = getFinalValues(values, node).serviceConfig;
  expect(saved.build).toBe("./image");
  expect(saved.env_file).toEqual([
    { path: "./base.env", required: false, format: "raw" },
    "./other.env"
  ]);
  expect(saved.networks).toEqual({ private: { aliases: ["api"] }, new: null });
  expect(saved.labels).toEqual({ keep: "yes", edit: "after" });
});

test.each([
  "registry.example.com:5000/team/app:1.2",
  "registry.example.com:5000/team/app",
  `team/app@sha256:${"a".repeat(64)}`,
  `team/app:1.2@sha256:${"b".repeat(64)}`
])("image reference survives save/reopen and unrelated edits: %s", (image) => {
  const node = service({ image });
  const values = getInitialValues(node);
  values.workingDir = "/srv";
  expect(getFinalValues(values, node).serviceConfig.image).toBe(image);
});

test("minimal forms validate blank optional numbers and preserve explicit zero", async () => {
  const values = structuredClone(getInitialValues());
  values.serviceName = "web";
  values.imageName = "nginx";
  await expect(validationSchema.validate(values)).resolves.toBeDefined();
  values.deploy.replicas = "0";
  values.deploy.restartPolicy.maxAttempts = "0";
  values.deploy.updateConfig.parallelism = "0";
  const saved = getFinalValues(values).serviceConfig;
  expect(saved.deploy?.replicas).toBe(0);
  expect(saved.deploy?.restart_policy?.max_attempts).toBe(0);
  expect(saved.deploy?.update_config?.parallelism).toBe(0);
});

test.each(["1x", "1.2", "-1", "1e2", "65536"])(
  "rejects malformed port input %s",
  async (value) => {
    const values = getInitialValues(service({ image: "nginx" }));
    values.ports = [{ hostPort: value, containerPort: "80", protocol: "tcp" }];
    await expect(validationSchema.validate(values)).rejects.toThrow();
  }
);
test.each(["1.5", "-1", "junk"])(
  "rejects noninteger deployment input %s",
  async (value) => {
    const values = getInitialValues(service({ image: "nginx" }));
    values.deploy.replicas = value;
    await expect(validationSchema.validate(values)).rejects.toThrow();
  }
);

test("volume/network form edits preserve external drivers, labels and nested opaque fields", () => {
  const graph = composeToCanvasGraph({
    services: {},
    volumes: { assets: { external: true, name: "shared", "x-note": "keep" } },
    networks: {
      private: {
        driver: "bridge",
        internal: true,
        ipam: {
          driver: "default",
          options: { keep: "yes" },
          config: [{ subnet: "10.0.0.0/24", "x-note": "keep" }]
        },
        labels: ["keep=yes"]
      }
    }
  });
  const volume = Object.values(graph.nodes)[0] as IVolumeNodeItem;
  const vv = volumeForm.getInitialValues(volume);
  vv.labels.push({ key: "owner", value: "team" });
  expect(volumeForm.getFinalValues(vv, volume).volumeConfig).toMatchObject({
    external: true,
    name: "shared",
    "x-note": "keep"
  });
  const network = Object.values(graph.networks)[0] as INetworkNodeItem;
  const nv = networkForm.getInitialValues(network);
  nv.configurations[0].subnet = "10.1.0.0/24";
  nv.labels.push({ key: "edit", value: "yes" });
  expect(networkForm.getFinalValues(nv, network).networkConfig).toMatchObject({
    driver: "bridge",
    internal: true,
    ipam: {
      options: { keep: "yes" },
      config: [{ subnet: "10.1.0.0/24", "x-note": "keep" }]
    },
    labels: { keep: "yes", edit: "yes" }
  });
});

test("storage configuration survives graph save/reload without leaking into Compose", () => {
  const graph = composeToCanvasGraph({
    services: { web: { image: "nginx", volumes: ["assets:/data"] } },
    volumes: { assets: {} }
  });
  const volume = Object.values(graph.nodes).find(
    (node) => node.type === "VOLUME"
  ) as IVolumeNodeItem;
  const values = volumeForm.getInitialValues(volume);
  values.storageSize = "7Gi";
  values.accessMode = "ReadWriteMany";
  values.storageClass = "shared";
  graph.nodes[volume.key] = volumeForm.getFinalValues(values, volume);
  const payload = generatePayload(JSON.parse(JSON.stringify(graph)));
  const pvc = documents(payload).find(
    (resource) => resource.kind === "PersistentVolumeClaim"
  );
  expect(pvc.spec).toEqual({
    accessModes: ["ReadWriteMany"],
    storageClassName: "shared",
    resources: { requests: { storage: "7Gi" } }
  });
  expect(
    YAML.parse(generateManifest(payload, manifestTypes.DOCKER_COMPOSE).code)
      .volumes.assets
  ).toEqual({});
});

test("missing storage choices block export and external aliases never provision a claim", () => {
  const payload = compose(
    { web: { image: "nginx", volumes: ["assets:/data"] } },
    { assets: {} }
  );
  expect(kube(payload).blocked).toBe(true);
  payload.data.volumes.assets = { external: true, name: "shared-assets" };
  const output = documents(payload);
  expect(
    output.some((resource) => resource.kind === "PersistentVolumeClaim")
  ).toBe(false);
  expect(
    output[0].spec.template.spec.volumes[0].persistentVolumeClaim.claimName
  ).toBe("shared-assets");
});

test("mixed native and newly generated services keep external claim aliases", () => {
  const payload = native([deployment()]);
  payload.data.services.added = { image: "nginx", volumes: ["assets:/data"] };
  payload.data.volumes.assets = { external: true, name: "shared-assets" };
  const output = documents(payload);
  expect(
    output.some((resource) => resource.kind === "PersistentVolumeClaim")
  ).toBe(false);
  expect(
    output.find((resource) => resource.metadata.name === "added").spec.template
      .spec.volumes[0].persistentVolumeClaim.claimName
  ).toBe("shared-assets");
});

test("normalized workload and claim names stay distinct and stable across ordering", () => {
  const payload = compose(
    {
      web_1: { image: "nginx", volumes: ["a_b:/data"] },
      "web-1": { image: "nginx", volumes: ["a-b:/data"] },
      "app.api": { image: "nginx" }
    },
    { a_b: {}, "a-b": {} }
  );
  payload.kubernetesStorage = {
    a_b: { size: "2Gi", accessMode: "ReadWriteOnce" },
    "a-b": { size: "3Gi", accessMode: "ReadWriteOnce" }
  };
  const output = documents(payload);
  const names = output
    .filter((resource) => resource.kind === "Deployment")
    .map((resource) => resource.metadata.name);
  expect(new Set(names).size).toBe(3);
  const claims = output
    .filter((resource) => resource.kind === "PersistentVolumeClaim")
    .map((resource) => resource.metadata.name);
  expect(new Set(claims).size).toBe(2);
  payload.data.services = Object.fromEntries(
    Object.entries(payload.data.services).reverse()
  );
  expect(
    documents(payload)
      .filter((resource) => resource.kind === "Deployment")
      .map((resource) => resource.metadata.name)
      .sort()
  ).toEqual(names.sort());
});

test.each([
  { "app.kubernetes.io/name": "other" },
  { "bad key": "value" },
  { owner: "a".repeat(64) }
])("invalid/reserved Kubernetes labels block export: %j", (labels) => {
  expect(kube(compose({ web: { image: "nginx", labels } })).blocked).toBe(true);
});

test("resource quantities normalize to bytes, retain zero, and enforce request <= limit", () => {
  const payload = compose({
    web: {
      image: "nginx",
      deploy: {
        replicas: 0,
        resources: {
          limits: { cpus: "0", memory: "512m" },
          reservations: { cpus: "0", memory: "256m" }
        }
      }
    }
  });
  const resource = documents(payload)[0];
  expect(resource.spec.replicas).toBe(0);
  expect(resource.spec.template.spec.containers[0].resources).toEqual({
    limits: { cpu: "0", memory: "536870912" },
    requests: { cpu: "0", memory: "268435456" }
  });
  payload.data.services.web.deploy!.resources!.reservations!.memory = "1g";
  expect(
    kube(payload).diagnostics.some(
      (item) => item.code === "RESOURCE_REQUEST_EXCEEDS_LIMIT"
    )
  ).toBe(true);
});

test.each(["8000-8005:80", "8080junk:80", "8080:0", "8080:65536"])(
  "Kubernetes rejects partial or invalid port conversion %s",
  (port) => {
    expect(
      kube(compose({ web: { image: "nginx", ports: [port] } })).blocked
    ).toBe(true);
  }
);

test("omissions are explicit, preserved, and expire when the source value changes", () => {
  const payload = compose({ web: { image: "nginx", env_file: "./app.env" } });
  const failure = kube(payload);
  const item = failure.diagnostics.find((entry) => entry.canExclude)!;
  expect(failure.blocked).toBe(true);
  payload.manifestSource = {
    exclusions: [
      {
        target: "KUBERNETES",
        sourcePath: item.sourcePath,
        fingerprint: item.fingerprint!
      }
    ]
  };
  expect(kube(payload).blocked).toBe(false);
  expect(payload.data.services.web.env_file).toBe("./app.env");
  payload.data.services.web.env_file = "./changed.env";
  expect(kube(payload).blocked).toBe(true);
});

test.each([{}, { build: "." }])(
  "Kubernetes never invents an image: %j",
  (config) => {
    const result = kube(compose({ web: config }));
    expect(result.blocked).toBe(true);
    expect(result.code).toBe("");
    expect(result.rawCode).not.toContain("web:latest");
  }
);

test("native edits receive variable and shared-workload conflict validation", () => {
  const payload = native([
    deployment([
      { name: "main", image: "nginx" },
      { name: "sidecar", image: "busybox" }
    ])
  ]);
  payload.data.services["web-main"].image = "${IMAGE}";
  expect(
    kube(payload).diagnostics.some(
      (item) => item.code === "VARIABLE_UNRESOLVED"
    )
  ).toBe(true);
  payload.data.services["web-main"].image = "nginx";
  payload.data.services["web-main"].deploy = { replicas: 2 };
  payload.data.services["web-sidecar"].deploy = { replicas: 3 };
  expect(kube(payload).error).toContain("conflicting replicas");
  payload.data.services["web-sidecar"].deploy = { replicas: 2 };
  expect(documents(payload)[0].spec.replicas).toBe(2);
});

test("deleting an imported workload retains storage and reports unselected Services", () => {
  const payload = native([
    deployment(),
    {
      apiVersion: "v1",
      kind: "Service",
      metadata: { name: "web", namespace: "demo" },
      spec: { selector: { app: "web" }, ports: [{ port: 80 }] }
    }
  ]);
  delete payload.data.services.web;
  const result = kube(payload);
  expect(result.blocked).toBe(false);
  expect(
    result.diagnostics.some((item) => item.code === "SERVICE_NO_LOCAL_WORKLOAD")
  ).toBe(true);
});

test("graph renames repair dependency dictionaries, volume sources and service namespace references", () => {
  let graph = composeToCanvasGraph({
    services: {
      api: {
        image: "nginx",
        depends_on: { db: { condition: "service_healthy", restart: true } },
        network_mode: "service:db",
        volumes: ["assets:/data:ro"]
      },
      db: { image: "postgres" }
    },
    volumes: { assets: {} }
  });
  const db = Object.values(graph.nodes).find(
    (node) => node.canvasConfig.node_name === "db"
  )!;
  graph = {
    ...graph,
    ...replaceCanvasNode(graph, {
      ...db,
      canvasConfig: { node_name: "database" }
    })
  };
  const volume = Object.values(graph.nodes).find(
    (node) => node.type === "VOLUME"
  )!;
  graph = {
    ...graph,
    ...replaceCanvasNode(graph, {
      ...volume,
      canvasConfig: { node_name: "data" }
    })
  };
  const api = generatePayload(graph).data.services.api;
  expect(api.depends_on).toEqual({
    database: { condition: "service_healthy", restart: true }
  });
  expect(api.network_mode).toBe("service:database");
  expect(api.volumes).toEqual(["data:/data:ro"]);
});

test("graph edges require a mount destination and dependency cycles are rejected", () => {
  let graph = composeToCanvasGraph({
    services: { api: { image: "nginx" }, db: { image: "postgres" } },
    volumes: { assets: {} }
  });
  const [api, db, volume] = Object.values(graph.nodes);
  graph = { ...graph, ...attachCanvasConnection(graph, [volume.key, api.key]) };
  expect(
    generateManifest(
      generatePayload(graph),
      manifestTypes.DOCKER_COMPOSE
    ).diagnostics.some((item) => item.code === "MOUNT_TARGET_REQUIRED")
  ).toBe(true);
  graph = { ...graph, ...attachCanvasConnection(graph, [api.key, db.key]) };
  expect(() => attachCanvasConnection(graph, [db.key, api.key])).toThrow(
    "cycle"
  );
  const removed = removeCanvasNode(graph, volume.key);
  expect(
    (removed.nodes[api.key] as IServiceNodeItem).serviceConfig.volumes
  ).toBeUndefined();
});

test("editing generated Kubernetes source preserves Compose files, storage ownership and host ports", () => {
  const original = composeToCanvasGraph({
    services: {
      web: {
        image: "nginx",
        env_file: "./app.env",
        ports: ["8080:80"],
        volumes: ["assets:/data"]
      }
    },
    volumes: { assets: {} }
  });
  const volume = Object.values(original.nodes).find(
    (node) => node.type === "VOLUME"
  ) as IVolumeNodeItem;
  volume.kubernetes = { size: "7Gi", accessMode: "ReadWriteMany" };
  const first = kube(generatePayload(original));
  const resources = YAML.parseAllDocuments(first.rawCode!).map((document) =>
    document.toJSON()
  );
  const container = resources.find((resource) => resource.kind === "Deployment")
    .spec.template.spec.containers[0];
  container.image = "nginx:stable";
  container.ports[0].containerPort = 8081;
  const imported = preserveComposeSettings(
    parseManifest(JSON.stringify(resources), "json"),
    original.nodes,
    original.networks
  );
  const graph = composeToCanvasGraph(
    imported.data,
    original.nodes,
    original.networks
  );
  const payload = generatePayload({
    ...JSON.parse(JSON.stringify(graph)),
    manifestSource: imported.source
  });
  expect(payload.data.services.web.env_file).toBe("./app.env");
  expect(payload.data.services.web.image).toBe("nginx:stable");
  expect(payload.data.services.web.ports).toEqual(["8080:8081"]);
  expect(payload.data.services.web.volumes).toEqual(["assets:/data"]);
  expect(payload.data.volumes.assets).toEqual({});
  expect(kube(payload).blocked).toBe(false);
  const output = generateManifest(payload, manifestTypes.DOCKER_COMPOSE);
  expect(
    output.diagnostics
      .filter((item) => item.blocksExport)
      .every((item) => item.code === "NATIVE_SETTING_UNREPRESENTED")
  ).toBe(true);
  expect(YAML.parse(output.rawCode!).volumes.assets).toEqual({});
});

test("native policies and Kubernetes variable expansion require explicit Compose exclusions", () => {
  const payload = native([
    deployment([
      {
        name: "app",
        image: "busybox",
        args: ["echo $(VALUE)"],
        env: [{ name: "VALUE", value: "$(BASE)" }],
        readinessProbe: { exec: { command: ["true"] } }
      }
    ])
  ]);
  const result = generateManifest(payload, manifestTypes.DOCKER_COMPOSE);
  expect(result.blocked).toBe(true);
  expect(
    result.diagnostics.filter(
      (item) => item.code === "NATIVE_SETTING_UNREPRESENTED"
    ).length
  ).toBeGreaterThanOrEqual(3);
  payload.manifestSource!.exclusions = result.diagnostics
    .filter((item) => item.canExclude)
    .map((item) => ({
      target: item.target,
      sourcePath: item.sourcePath,
      fingerprint: item.fingerprint!
    }));
  expect(generateManifest(payload, manifestTypes.DOCKER_COMPOSE).blocked).toBe(
    false
  );
});

test("native semantic validation catches replicas, quantities, selectors and dangling mounts", () => {
  const resource = deployment([
    {
      name: "app",
      image: "nginx",
      resources: { limits: { memory: "invalid" } },
      volumeMounts: [{ name: "missing", mountPath: "/data" }]
    }
  ]);
  resource.spec.replicas = -1;
  resource.spec.template.metadata.labels.app = "other";
  const result = kube(native([resource]));
  for (const code of [
    "REPLICAS_INVALID",
    "RESOURCE_QUANTITY",
    "SELECTOR_MISMATCH",
    "REFERENCE_MISSING"
  ])
    expect(result.diagnostics.some((item) => item.code === code)).toBe(true);
});

test.each(["web_1", "app.api", "1web", "a".repeat(80)])(
  "invalid source names receive stable valid container/resource identities: %s",
  (name) => {
    const output = documents(
      compose({ [name]: { image: "nginx", ports: ["80"] } })
    );
    expect(output[0].metadata.name).toMatch(/^[a-z][a-z0-9-]*$/);
    expect(output[0].metadata.name.length).toBeLessThanOrEqual(63);
    expect(output[0].spec.template.spec.containers[0].name).toBe(
      output[0].metadata.name
    );
  }
);

test("claim aliases cannot disagree about ownership or capacity", () => {
  const payload = compose(
    { web: { image: "nginx", volumes: ["a:/a", "b:/b"] } },
    { a: { name: "shared" }, b: { name: "shared" } }
  );
  payload.kubernetesStorage = {
    a: { size: "1Gi", accessMode: "ReadWriteOnce" },
    b: { size: "2Gi", accessMode: "ReadWriteOnce" }
  };
  expect(
    kube(payload).diagnostics.some(
      (item) => item.code === "CLAIM_IDENTITY_CONFLICT"
    )
  ).toBe(true);
});

test("forms preserve entirely opaque nested objects when adding or clearing represented fields", () => {
  const node = service({
    image: "nginx",
    build: { additional_contexts: { shared: "../shared" } }
  });
  const values = getInitialValues(node);
  values.build.context = ".";
  const saved = getFinalValues(values, node);
  expect(saved.serviceConfig.build).toEqual({
    context: ".",
    additional_contexts: { shared: "../shared" }
  });
  const reopened = getInitialValues(saved);
  reopened.build.context = "";
  expect(getFinalValues(reopened, saved).serviceConfig.build).toEqual({
    additional_contexts: { shared: "../shared" }
  });
});

test("form defaults are independent and whitespace optional numbers stay unset", async () => {
  const values = getInitialValues(service({ image: "nginx" }));
  values.deploy.replicas = " ";
  values.deploy.resources.limits.pids = " ";
  await expect(validationSchema.validate(values)).resolves.toBeDefined();
  const saved = getFinalValues(values);
  expect(saved.serviceConfig.deploy?.replicas).toBeUndefined();
  expect(saved.serviceConfig.deploy?.resources?.limits?.pids).toBeUndefined();
  expect(getInitialValues().deploy.replicas).toBe("");
});

test("short port edits preserve host IP bindings and environment duplicates are rejected", async () => {
  const node = service({ image: "nginx", ports: ["127.0.0.1:8080:80/tcp"] });
  const values = getInitialValues(node);
  values.ports[0].hostPort = "9090";
  expect(getFinalValues(values, node).serviceConfig.ports).toEqual([
    "127.0.0.1:9090:80/tcp"
  ]);
  values.environmentVariables = [
    { key: "MODE", value: "one" },
    { key: "MODE", value: "two" }
  ];
  await expect(validationSchema.validate(values)).rejects.toThrow("unique");
});

test("native environment edits keep valueFrom references in their original expansion order", () => {
  const payload = native([
    deployment([
      {
        name: "app",
        image: "busybox",
        env: [
          { name: "FIRST", value: "before" },
          {
            name: "BASE",
            valueFrom: { secretKeyRef: { name: "credentials", key: "value" } }
          },
          { name: "LAST", value: "$(BASE)" }
        ]
      }
    ])
  ]);
  payload.data.services.web.environment = { FIRST: "after", LAST: "$$(BASE)" };
  const env = documents(payload)[0].spec.template.spec.containers[0].env;
  expect(env.map((entry: any) => entry.name)).toEqual([
    "FIRST",
    "BASE",
    "LAST"
  ]);
  expect(env[0].value).toBe("after");
  expect(env[1].valueFrom.secretKeyRef.name).toBe("credentials");
});

test.each(["8080junk:80", "8080:0", "80/smtp", "80/tcp/extra"])(
  "Compose semantic validation rejects malformed raw ports: %s",
  (port) => {
    expect(
      generateManifest(
        compose({ web: { image: "nginx", ports: [port] } }),
        manifestTypes.DOCKER_COMPOSE
      ).blocked
    ).toBe(true);
  }
);

test("placement and IPAM row removal keeps opaque options with their original row", () => {
  const node = service({
    image: "nginx",
    deploy: {
      placement: {
        preferences: [
          { spread: "node.labels.a", "x-note": "a" },
          { spread: "node.labels.b", "x-note": "b" }
        ]
      }
    }
  });
  const values = getInitialValues(node);
  values.deploy.placement.preferences.shift();
  values.deploy.placement.preferences[0].value = "node.labels.c";
  expect(
    getFinalValues(values, node).serviceConfig.deploy?.placement?.preferences
  ).toEqual([{ spread: "node.labels.c", "x-note": "b" }]);
  const graph = composeToCanvasGraph({
    services: {},
    networks: {
      private: {
        ipam: {
          config: [
            { subnet: "10.0.0.0/24", "x-note": "a" },
            { subnet: "10.1.0.0/24", "x-note": "b" }
          ]
        }
      }
    }
  });
  const network = Object.values(graph.networks)[0];
  const nv = networkForm.getInitialValues(network);
  nv.configurations.shift();
  nv.configurations[0].subnet = "10.2.0.0/24";
  expect(
    networkForm.getFinalValues(nv, network).networkConfig.ipam?.config
  ).toEqual([{ subnet: "10.2.0.0/24", "x-note": "b" }]);
});

test("editing a migrated legacy preference retains the user's new value", () => {
  const node = service({
    image: "nginx",
    deploy: { placement: { preferences: ["spread=node.labels.old"] } }
  });
  const values = getInitialValues(node);
  values.deploy.placement.preferences[0].value = "node.labels.new";
  expect(
    getFinalValues(values, node).serviceConfig.deploy?.placement?.preferences
  ).toEqual([{ spread: "node.labels.new" }]);
});

test.each(["1.001", "0.029", "1.0010"])(
  "valid millicore values do not fail floating point precision checks: %s",
  (cpus) => {
    const output = documents(
      compose({
        web: { image: "nginx", deploy: { resources: { limits: { cpus } } } }
      })
    );
    expect(
      output[0].spec.template.spec.containers[0].resources.limits.cpu
    ).toBe(cpus);
  }
);

test("unprojectable native quantities receive a Compose diagnostic", () => {
  const payload = native([
    deployment([
      { name: "app", image: "nginx", resources: { limits: { cpu: "1e3" } } }
    ])
  ]);
  const result = generateManifest(payload, manifestTypes.DOCKER_COMPOSE);
  expect(
    result.diagnostics.some(
      (item) =>
        item.code === "NATIVE_SETTING_UNREPRESENTED" &&
        item.sourcePath.endsWith("/limits/cpu")
    )
  ).toBe(true);
});
