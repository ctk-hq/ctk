import YAML from "yaml";
import { manifestTypes } from "../constants";
import type { IGeneratePayload, IServiceNodeItem } from "../types";
import { generateManifest } from "../services/generate";
import { composeToCanvasGraph } from "./compose";
import { generatePayload } from "./generators";
import { parseManifest } from "./manifests";

export const nativeResources = [
  {
    apiVersion: "v1",
    kind: "PersistentVolumeClaim",
    metadata: { name: "assets", namespace: "demo" },
    spec: {
      accessModes: ["ReadWriteMany"],
      resources: { requests: { storage: "7Gi" } },
      storageClassName: "shared"
    }
  },
  {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: {
      name: "web",
      namespace: "demo",
      annotations: { owner: "example" }
    },
    spec: {
      replicas: 2,
      selector: { matchLabels: { app: "web" } },
      template: {
        metadata: { labels: { app: "web" } },
        spec: {
          serviceAccountName: "application",
          containers: [
            {
              name: "nginx",
              image: "nginx:1.29",
              command: ["/bin/sh"],
              args: ["-c", "exec nginx -g 'daemon off;'"],
              env: [
                { name: "MODE", value: "demo" },
                {
                  name: "TOKEN",
                  valueFrom: {
                    secretKeyRef: { name: "credentials", key: "token" }
                  }
                }
              ],
              ports: [{ name: "http", containerPort: 80 }],
              resources: {
                requests: { cpu: "250m", memory: "128Mi" },
                limits: { cpu: "1", memory: "256Mi", "example.com/device": "1" }
              },
              securityContext: {
                readOnlyRootFilesystem: true,
                runAsGroup: 1000
              },
              readinessProbe: { httpGet: { path: "/ready", port: "http" } },
              volumeMounts: [
                {
                  name: "content",
                  mountPath: "/usr/share/nginx/html",
                  readOnly: true
                }
              ]
            }
          ],
          volumes: [
            { name: "content", persistentVolumeClaim: { claimName: "assets" } }
          ]
        }
      }
    }
  },
  {
    apiVersion: "v1",
    kind: "Service",
    metadata: { name: "frontend", namespace: "demo" },
    spec: {
      type: "ClusterIP",
      selector: { app: "web" },
      ports: [{ port: 8080, targetPort: "http" }]
    }
  },
  {
    apiVersion: "v1",
    kind: "ConfigMap",
    metadata: { name: "settings", namespace: "demo" },
    data: { mode: "demo" }
  }
];

const kubernetes = (payload: IGeneratePayload) => {
  const result = generateManifest(payload, manifestTypes.KUBERNETES);
  expect(result.error).toBeUndefined();
  return YAML.parseAllDocuments(result.code).map((document) =>
    document.toJSON()
  );
};

function importNative() {
  const imported = parseManifest(
    nativeResources.map((resource) => YAML.stringify(resource)).join("---\n"),
    "yaml"
  );
  return { data: imported.data, manifestSource: imported.source };
}

test("Compose import updates nodes and edges and retains native top-level sections", () => {
  const imported = parseManifest(
    `name: existing\nx-common: &defaults\n  restart: unless-stopped\nservices:\n  web:\n    <<: *defaults\n    image: nginx\n    depends_on: [db]\n    volumes: [assets:/data:ro]\n    configs: [settings]\n  db:\n    image: postgres\nvolumes:\n  assets: {}\nconfigs:\n  settings:\n    file: ./settings.conf\nsecrets:\n  password:\n    external: true\n`,
    "yaml"
  );
  const graph = composeToCanvasGraph(imported.data);
  expect(Object.keys(graph.nodes)).toHaveLength(3);
  expect(graph.connections).toHaveLength(2);
  const payload = generatePayload({
    ...graph,
    manifestSource: imported.source
  });
  const output = YAML.parse(
    generateManifest(payload, manifestTypes.DOCKER_COMPOSE).code
  );
  expect(output.name).toBe("existing");
  expect(output.configs.settings.file).toBe("./settings.conf");
  expect(output.secrets.password.external).toBe(true);
  expect(output.services.web.restart).toBe("unless-stopped");
  expect(imported.source.warnings?.[0]).toContain("configs, secrets");
});

test("multi-document Kubernetes import creates services, volumes and volume edges", () => {
  const payload = importNative();
  const graph = composeToCanvasGraph(payload.data);
  expect(Object.keys(graph.nodes)).toHaveLength(2);
  expect(graph.connections).toHaveLength(1);
  expect(payload.data.services.web).toMatchObject({
    image: "nginx:1.29",
    entrypoint: ["/bin/sh"],
    command: ["-c", "exec nginx -g 'daemon off;'"],
    expose: ["80"],
    deploy: {
      replicas: 2,
      resources: { reservations: { cpus: "0.25", memory: "134217728" } }
    }
  });
  const compose = YAML.parse(
    generateManifest(payload, manifestTypes.DOCKER_COMPOSE).rawCode!
  );
  expect(compose.services.web.environment).toEqual({ MODE: "demo" });
  expect(compose.services.web.ports).toBeUndefined();
  expect(compose.volumes.assets).toMatchObject({
    external: true,
    name: "assets"
  });
  expect(payload.manifestSource.warnings?.join(" ")).toContain("Secrets");
});

test("native resources survive generation, graph movement and save/reload without semantic loss", () => {
  const payload = importNative();
  expect(kubernetes(payload)).toEqual(nativeResources);
  const graph = composeToCanvasGraph(payload.data);
  const saved = JSON.parse(
    JSON.stringify({ ...graph, manifestSource: payload.manifestSource })
  );
  Object.values(saved.nodes).forEach((node: any) => {
    node.position.left += 25;
  });
  expect(kubernetes(generatePayload(saved))).toEqual(nativeResources);
});

test("graph edits update native container settings while preserving probes, selectors, references and storage", () => {
  const payload = importNative();
  payload.data.services.web = {
    ...payload.data.services.web,
    image: "nginx:stable",
    environment: { MODE: "production" },
    deploy: { replicas: 3 }
  };
  const output = kubernetes(payload);
  const deployment = output[1];
  expect(deployment.spec.replicas).toBe(3);
  const container = deployment.spec.template.spec.containers[0];
  expect(container.image).toBe("nginx:stable");
  expect(container.env).toContainEqual(
    nativeResources[1].spec!.template!.spec.containers[0].env![1]
  );
  expect(container.env).toContainEqual({ name: "MODE", value: "production" });
  expect(container.readinessProbe).toEqual(
    nativeResources[1].spec!.template!.spec.containers[0].readinessProbe
  );
  expect(container.resources.limits).toEqual({ "example.com/device": "1" });
  expect(output[0]).toEqual(nativeResources[0]);
  expect(output[2]).toEqual(nativeResources[2]);
});

test.each(["json-array", "json-list", "yaml-list"])(
  "accepts Kubernetes %s",
  (format) => {
    const resourceList = {
      apiVersion: "v1",
      kind: "List",
      items: nativeResources
    };
    const text =
      format === "json-array"
        ? JSON.stringify(nativeResources)
        : format === "json-list"
          ? JSON.stringify(resourceList)
          : YAML.stringify(resourceList);
    const imported = parseManifest(
      text,
      format.startsWith("json") ? "json" : "yaml"
    );
    expect(Object.keys(imported.data.services)).toEqual(["web"]);
    expect(imported.source.kubernetes?.documents).toEqual(nativeResources);
  }
);

test("maps sidecars to separate graph services while preserving the native Pod", () => {
  const pod = {
    apiVersion: "v1",
    kind: "Pod",
    metadata: { name: "app" },
    spec: {
      initContainers: [{ name: "init", image: "busybox" }],
      containers: [
        { name: "main", image: "nginx" },
        { name: "sidecar", image: "busybox" }
      ]
    }
  };
  const imported = parseManifest(JSON.stringify(pod), "json");
  expect(Object.keys(imported.data.services)).toEqual([
    "app-main",
    "app-sidecar"
  ]);
  expect(imported.source.warnings?.join(" ")).toContain("Pod sharing");
  expect(
    kubernetes({ data: imported.data, manifestSource: imported.source })
  ).toEqual([pod]);
});

test("stable node bindings support renames, deletions and newly added services", () => {
  const payload = importNative();
  const graph = composeToCanvasGraph(payload.data);
  const web = Object.values(graph.nodes).find(
    (node) => node.type === "SERVICE"
  ) as IServiceNodeItem;
  payload.manifestSource.kubernetes!.bindings[0].nodeKey = web.key;
  web.canvasConfig.node_name = "renamed";
  web.serviceConfig.image = "nginx:stable";
  expect(
    kubernetes(
      generatePayload({ ...graph, manifestSource: payload.manifestSource })
    )[1].spec.template.spec.containers[0].image
  ).toBe("nginx:stable");
  delete graph.nodes[web.key];
  const result = kubernetes(
    generatePayload({ ...graph, manifestSource: payload.manifestSource })
  );
  expect(result.some((resource) => resource.kind === "Deployment")).toBe(false);
  payload.data.services = { added: { image: "redis" } };
  expect(
    kubernetes(payload).some(
      (resource) =>
        resource.kind === "Deployment" && resource.metadata.name === "added"
    )
  ).toBe(true);
});

test.each([
  "",
  "hello",
  "services: [wrong]",
  "services:\n  web: nginx",
  "services: {}\nvolumes: []",
  "foo:\n  nested: value",
  "services: {}\n---\nservices: {}",
  "apiVersion: v1\nkind: Pod",
  "services: [",
  "services: {}\nservices: {}"
])(
  "rejects invalid/incomplete manifests without producing an empty replacement graph: %s",
  (text) => {
    expect(() => parseManifest(text, "yaml")).toThrow();
  }
);

test("rejects duplicate Kubernetes identities and malformed Lists", () => {
  expect(() =>
    parseManifest(
      JSON.stringify([nativeResources[1], nativeResources[1]]),
      "json"
    )
  ).toThrow("Duplicate");
  expect(() =>
    parseManifest(
      JSON.stringify({ apiVersion: "v1", kind: "List", items: ["bad"] }),
      "json"
    )
  ).toThrow("metadata.name");
});

test("unknown resources are retained and diagnosed without inventing a Compose service", () => {
  const resource = {
    apiVersion: "example.io/v1",
    kind: "Widget",
    metadata: { name: "custom" },
    spec: { opaque: true }
  };
  const imported = parseManifest(JSON.stringify(resource), "json");
  expect(imported.data.services).toEqual({});
  expect(imported.source.warnings?.join(" ")).toContain("no graph node");
  const generated = generateManifest(
    { data: imported.data, manifestSource: imported.source },
    manifestTypes.KUBERNETES
  );
  expect(generated.blocked).toBe(true);
  expect(
    generated.diagnostics.some((item) => item.code === "API_SCHEMA_UNKNOWN")
  ).toBe(true);
  expect(YAML.parse(generated.rawCode!)).toEqual(resource);
});

test("native literal dollars stay literal in Compose and after subsequent graph edits", () => {
  const pod = {
    apiVersion: "v1",
    kind: "Pod",
    metadata: { name: "literal" },
    spec: {
      containers: [
        {
          name: "app",
          image: "busybox",
          args: ["echo $HOME ${VALUE}"],
          env: [{ name: "VALUE", value: "$literal" }]
        }
      ]
    }
  };
  const imported = parseManifest(JSON.stringify(pod), "json");
  const payload = { data: imported.data, manifestSource: imported.source };
  expect(imported.data.services.literal.command).toEqual([
    "echo $$HOME $${VALUE}"
  ]);
  expect(imported.data.services.literal.environment).toEqual({
    VALUE: "$$literal"
  });
  payload.data.services.literal.environment = { VALUE: "$$changed" };
  expect(kubernetes(payload)[0].spec.containers[0].env).toEqual([
    { name: "VALUE", value: "$changed" }
  ]);
  const generated = generateManifest(
    { data: imported.data },
    manifestTypes.KUBERNETES
  );
  expect(generated.error).toBeUndefined();
  expect(
    YAML.parse(generated.code).spec.template.spec.containers[0].args
  ).toEqual(["echo $HOME ${VALUE}"]);
});

test("native storage edits and unsupported deployment policies report an actionable error", () => {
  const payload = importNative();
  payload.data.volumes.assets.name = "different-claim";
  expect(generateManifest(payload, manifestTypes.KUBERNETES).error).toContain(
    "edit imported Kubernetes storage"
  );
  payload.data.volumes.assets.name = "assets";
  payload.data.services.web.deploy = { mode: "global" };
  expect(generateManifest(payload, manifestTypes.KUBERNETES).error).toContain(
    "deployment policies"
  );
});

test("container port edits retain native names and prevent dangling Service references", () => {
  const payload = importNative();
  payload.data.services.web.expose = ["8080"];
  const output = kubernetes(payload);
  expect(output[1].spec.template.spec.containers[0].ports).toEqual([
    { name: "http", containerPort: 8080, protocol: "TCP" }
  ]);
  expect(output[2].spec.ports[0].targetPort).toBe("http");
  payload.data.services.web.expose = [];
  expect(generateManifest(payload, manifestTypes.KUBERNETES).error).toContain(
    "removed named port"
  );
});

test("graph form edits preserve a native workload and numeric replicas", async () => {
  const { getInitialValues, getFinalValues } =
    await import("../components/modals/docker-compose/service/form-utils");
  const payload = importNative();
  const graph = composeToCanvasGraph(payload.data);
  const web = Object.values(graph.nodes).find(
    (node) => node.type === "SERVICE"
  ) as IServiceNodeItem;
  const form = getInitialValues(web);
  form.imageTag = "stable";
  form.deploy.replicas = "4";
  graph.nodes[web.key] = getFinalValues(form, web);
  const resources = kubernetes(
    generatePayload({ ...graph, manifestSource: payload.manifestSource })
  );
  expect(resources[1].spec.replicas).toBe(4);
  expect(resources[1].spec.template.spec.containers[0].image).toBe(
    "nginx:stable"
  );
  expect(resources[1].spec.template.spec.containers[0].readinessProbe).toEqual(
    nativeResources[1].spec!.template!.spec.containers[0].readinessProbe
  );
});
