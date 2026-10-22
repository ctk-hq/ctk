import YAML from "yaml";
import { manifestTypes } from "../constants";
import type { IGeneratePayload, IServiceNodeItem } from "../types";
import type { KubernetesServiceConfig } from "../types/service-exposure";
import { generateManifest } from "./generate";
import { parseManifest } from "../utils/manifests";
import { composeToCanvasGraph } from "../utils/compose";
import { generatePayload } from "../utils/generators";
import { hydrateServiceNetworking } from "../utils/kubernetes-services";
import { isIPAddress } from "../utils/ip-address";
import { preserveComposeSettings } from "../utils/manifest-reconciliation";
import {
  getInitialValues,
  getFinalValues,
  validationSchema
} from "../components/modals/docker-compose/service/form-utils";

const base = (): IGeneratePayload => ({
  data: {
    services: { web: { image: "nginx", ports: ["127.0.0.1:8080:80"] } },
    volumes: {},
    networks: {}
  }
});
const exposure = (
  type: KubernetesServiceConfig["type"] = "NodePort"
): KubernetesServiceConfig => ({
  type,
  ports: [
    {
      name: "http",
      port: 8081,
      targetPort: 80,
      protocol: "TCP",
      ...(type === "NodePort" ? { nodePort: 30080 } : {})
    }
  ]
});
const render = (payload: IGeneratePayload) =>
  generateManifest(payload, manifestTypes.KUBERNETES);
const docs = (payload: IGeneratePayload) => {
  const result = render(payload);
  expect(result.error).toBeUndefined();
  return YAML.parseAllDocuments(result.code).map((doc) => doc.toJSON());
};
const workload = (namespace = "demo") => ({
  apiVersion: "apps/v1",
  kind: "Deployment",
  metadata: { name: "web", namespace },
  spec: {
    selector: { matchLabels: { app: "web" } },
    template: {
      metadata: { labels: { app: "web" } },
      spec: {
        containers: [
          {
            name: "app",
            image: "nginx",
            ports: [{ name: "http", containerPort: 80 }]
          }
        ]
      }
    }
  }
});
const service = (namespace = "demo") => ({
  apiVersion: "v1",
  kind: "Service",
  metadata: {
    name: "public-web",
    namespace,
    annotations: { "example.com/provider": "retain" }
  },
  spec: {
    type: "NodePort",
    clusterIP: "10.96.0.10",
    selector: { app: "web" },
    sessionAffinity: "ClientIP",
    ports: [
      {
        name: "http",
        port: 8081,
        targetPort: "http",
        protocol: "TCP",
        nodePort: 30080,
        appProtocol: "http"
      }
    ]
  }
});
const importedGraph = (resources: any[]) => {
  const imported = parseManifest(JSON.stringify(resources), "json");
  return {
    ...composeToCanvasGraph(imported.data, {}, {}, imported.source),
    manifestSource: imported.source
  };
};
const graphNode = (graph: ReturnType<typeof importedGraph>) =>
  Object.values(graph.nodes)[0] as IServiceNodeItem;

for (const type of ["ClusterIP", "NodePort", "LoadBalancer"] as const)
  test(`authors ${type} independently of Compose host bindings`, () => {
    const payload = base();
    payload.kubernetesServices = { web: exposure(type) };
    const resources = docs(payload);
    expect(resources.find((doc) => doc.kind === "Service").spec).toMatchObject({
      type,
      ports: exposure(type).ports
    });
    expect(resources[0].spec.template.spec.containers[0].ports).toHaveLength(1);
    const compose = generateManifest(payload, manifestTypes.DOCKER_COMPOSE);
    expect(compose.blocked).toBe(false);
    expect(YAML.parse(compose.code).services.web.ports).toEqual([
      "127.0.0.1:8080:80"
    ]);
    expect(compose.code).not.toContain("nodePort");
  });

test("keeps legacy default internal and never infers external access", () => {
  const payload = base();
  payload.data.services.web.ports = ["8080:80"];
  const resources = docs(payload);
  const spec = resources.find((doc) => doc.kind === "Service").spec;
  expect(spec.type).toBeUndefined();
  expect(spec.ports[0]).toMatchObject({ port: 8080, targetPort: 80 });
  expect(
    render(payload).diagnostics.some(
      (item) => item.code === "PORT_CLUSTER_INTERNAL"
    )
  ).toBe(true);
});

test("explicit No Service retains container declarations and Compose bindings", () => {
  const payload = base();
  payload.kubernetesServices = { web: { type: "None", ports: [] } };
  const resources = docs(payload);
  expect(resources.map((doc) => doc.kind)).toEqual(["Deployment"]);
  expect(
    resources[0].spec.template.spec.containers[0].ports[0].containerPort
  ).toBe(80);
});

test("preserves protocols and allows automatic node allocation", () => {
  const payload = base();
  payload.kubernetesServices = {
    web: {
      type: "NodePort",
      ports: [
        { name: "dns-tcp", port: 53, targetPort: 5353, protocol: "TCP" },
        { name: "dns-udp", port: 53, targetPort: 5353, protocol: "UDP" },
        { name: "sctp", port: 5000, targetPort: 5000, protocol: "SCTP" }
      ]
    }
  };
  const resources = docs(payload);
  expect(resources.find((doc) => doc.kind === "Service").spec.ports).toEqual(
    payload.kubernetesServices.web.ports
  );
  expect(resources[0].spec.template.spec.containers[0].ports).toHaveLength(4);
});

test.each([
  ["SERVICE_PORT_INVALID", { port: 65536 }],
  ["SERVICE_PORT_INVALID", { port: 1.5 }],
  ["SERVICE_TARGET_INVALID", { targetPort: 0 }],
  ["SERVICE_TARGET_INVALID", { targetPort: "65536" }],
  ["PORT_NAME_INVALID", { name: "HTTP!" }],
  ["APP_PROTOCOL_INVALID", { appProtocol: "https://bad" }],
  ["NODE_PORT_INVALID", { nodePort: -1 }],
  ["NODE_PORT_INVALID", { nodePort: 70000 }],
  ["PORT_PROTOCOL", { protocol: "HTTP" }]
])("blocks malformed Service settings: %s %j", (code, change) => {
  const payload = base();
  const settings = exposure();
  Object.assign(settings.ports[0], change);
  payload.kubernetesServices = { web: settings };
  const result = render(payload);
  expect(result.blocked).toBe(true);
  expect(result.diagnostics.some((item) => item.code === code)).toBe(true);
});

test("requires ports and rejects duplicate ports, names and node allocations", () => {
  const payload = base();
  const settings = exposure();
  settings.ports.push({ ...settings.ports[0] });
  payload.kubernetesServices = { web: settings };
  for (const code of [
    "SERVICE_PORT_DUPLICATE",
    "PORT_NAME_INVALID",
    "NODE_PORT_DUPLICATE"
  ])
    expect(render(payload).diagnostics.some((item) => item.code === code)).toBe(
      true
    );
  settings.ports = [];
  expect(
    render(payload).diagnostics.some(
      (item) => item.code === "SERVICE_PORT_REQUIRED"
    )
  ).toBe(true);
});

test("rejects ClusterIP node ports and cross-Service node port conflicts", () => {
  const payload = base();
  payload.kubernetesServices = { web: { ...exposure(), type: "ClusterIP" } };
  expect(
    render(payload).diagnostics.some(
      (item) => item.code === "NODE_PORT_FORBIDDEN"
    )
  ).toBe(true);
  payload.data.services.other = { image: "nginx" };
  payload.kubernetesServices = { web: exposure(), other: exposure() };
  expect(
    render(payload).diagnostics.some(
      (item) => item.code === "NODE_PORT_CONFLICT"
    )
  ).toBe(true);
});

test("imports, edits, saves and reopens native exposure without losing Service settings", () => {
  const graph = importedGraph([workload(), service()]);
  const node = graphNode(graph);
  expect(node.kubernetes?.service?.ports[0].targetPort).toBe("http");
  const values = getInitialValues(node);
  values.kubernetesService.ports[0].servicePort = "8082";
  values.kubernetesService.ports[0].nodePort = "30081";
  const saved = getFinalValues(values, node);
  const reloaded = JSON.parse(
    JSON.stringify({ ...graph, nodes: { [saved.key]: saved } })
  );
  const resources = docs(generatePayload(reloaded));
  const actual = resources.find((doc) => doc.kind === "Service");
  expect(actual.metadata).toEqual(service().metadata);
  expect(actual.spec).toMatchObject({
    type: "NodePort",
    clusterIP: "10.96.0.10",
    sessionAffinity: "ClientIP",
    selector: { app: "web" },
    ports: [
      { port: 8082, targetPort: "http", nodePort: 30081, appProtocol: "http" }
    ]
  });
  expect(getInitialValues(saved).kubernetesService.ports[0].servicePort).toBe(
    "8082"
  );
  expect(resources[0]).toEqual(workload());
});

test("native type transitions clear node ports but retain metadata and selectors", () => {
  const graph = importedGraph([workload(), service()]);
  const node = graphNode(graph);
  const values = getInitialValues(node);
  values.kubernetesService.type = "ClusterIP";
  values.kubernetesService.ports[0].nodePort = "";
  graph.nodes[node.key] = getFinalValues(values, node);
  const spec = docs(generatePayload(graph)).find(
    (doc) => doc.kind === "Service"
  ).spec;
  expect(spec.type).toBe("ClusterIP");
  expect(spec.ports[0].nodePort).toBeUndefined();
  expect(spec.selector).toEqual({ app: "web" });
});

test("advanced provider options block incompatible type changes without changing source", () => {
  const original = service() as any;
  original.spec.type = "LoadBalancer";
  original.spec.loadBalancerClass = "example.com/provider";
  const graph = importedGraph([workload(), original]);
  const node = graphNode(graph);
  node.kubernetes!.service!.type = "NodePort";
  const result = render(generatePayload(graph));
  expect(result.error).toContain("loadBalancerClass");
  expect(graph.manifestSource.kubernetes!.documents[1]).toEqual(original);
});

test.each(["multiple", "shared", "sidecars", "headless"])(
  "preserves %s native Services and requires source editing",
  (kind) => {
    const resources: any[] = [workload(), service()];
    if (kind === "multiple") {
      const other = service();
      other.metadata.name = "other";
      other.spec.ports[0].nodePort = 30081;
      resources.push(other);
    }
    if (kind === "shared")
      resources.push({
        ...workload(),
        metadata: { name: "other", namespace: "demo" }
      });
    if (kind === "sidecars")
      resources[0].spec.template.spec.containers.push({
        name: "sidecar",
        image: "busybox"
      });
    if (kind === "headless") {
      resources[1].spec = {
        ...resources[1].spec,
        type: "ClusterIP",
        clusterIP: "None",
        ports: [{ port: 80 }]
      };
    }
    const graph = importedGraph(resources);
    expect(graphNode(graph).kubernetes?.serviceNotice).toContain(
      "Kubernetes manifest"
    );
    expect(docs(generatePayload(graph))).toEqual(resources);
    graphNode(graph).kubernetes!.service = exposure();
    expect(render(generatePayload(graph)).error).toContain(
      "shared or advanced"
    );
  }
);

test("associates Services by selector and namespace rather than name or document order", () => {
  const resources = [service("other"), service(), workload()];
  (resources[0] as ReturnType<typeof service>).spec.ports[0].nodePort = 30081;
  const graph = importedGraph(resources);
  const node = graphNode(graph);
  node.kubernetes!.service!.ports[0].port = 8082;
  const result = docs(generatePayload(graph));
  expect(result[0]).toEqual(resources[0]);
  expect(result[1].spec.ports[0].port).toBe(8082);
  expect(result[1].metadata.name).toBe("public-web");
});

test("rejects missing named targets and protocol mismatches", () => {
  const graph = importedGraph([workload(), service()]);
  graphNode(graph).kubernetes!.service!.ports[0].targetPort = "missing";
  expect(
    render(generatePayload(graph)).diagnostics.some(
      (item) => item.code === "SERVICE_TARGET_MISSING"
    )
  ).toBe(true);
  graphNode(graph).kubernetes!.service!.ports[0].targetPort = "http";
  graphNode(graph).kubernetes!.service!.ports[0].protocol = "UDP";
  expect(
    render(generatePayload(graph)).diagnostics.some(
      (item) => item.code === "SERVICE_TARGET_MISSING"
    )
  ).toBe(true);
});

test("creates a Service for an imported workload and explicitly removes an existing Service", () => {
  const graph = importedGraph([workload()]);
  const node = graphNode(graph);
  expect(node.kubernetes!.service!.type).toBe("None");
  node.kubernetes!.service = exposure("ClusterIP");
  const resources = docs(generatePayload(graph));
  expect(resources[1].metadata).toEqual({ name: "web", namespace: "demo" });
  expect(resources[1].spec.selector).toEqual({ app: "web" });
  const imported = importedGraph([workload(), service()]);
  graphNode(imported).kubernetes!.service = { type: "None", ports: [] };
  expect(docs(generatePayload(imported)).map((doc) => doc.kind)).toEqual([
    "Deployment"
  ]);
});

test("hydrates old saved projects and preserves explicit exposure across Compose text edits", () => {
  const graph = importedGraph([workload(), service()]);
  const node = graphNode(graph);
  delete node.kubernetes;
  const hydrated = hydrateServiceNetworking(graph.nodes, graph.manifestSource);
  expect(
    (hydrated[node.key] as IServiceNodeItem).kubernetes?.service?.type
  ).toBe("NodePort");
  const updated = composeToCanvasGraph(
    { services: { web: { image: "nginx:alpine" } } },
    hydrated
  );
  expect(
    (updated.nodes[node.key] as IServiceNodeItem).kubernetes?.service?.type
  ).toBe("NodePort");
});

test("Compose bindings, internal ports and Kubernetes Service settings survive independent form edits", async () => {
  const node = Object.values(
    composeToCanvasGraph({
      services: {
        web: {
          image: "nginx",
          ports: [
            {
              target: 80,
              published: "8080",
              host_ip: "127.0.0.1",
              mode: "host",
              app_protocol: "http"
            }
          ],
          expose: ["9000/udp"]
        }
      }
    }).nodes
  )[0] as IServiceNodeItem;
  const values = getInitialValues(node);
  values.kubernetesService.type = "NodePort";
  values.kubernetesService.ports[0].servicePort = "81";
  values.kubernetesService.ports[0].nodePort = "30081";
  values.ports[0].hostIP = "::1";
  values.exposedPorts[0].containerPort = "9001";
  await expect(validationSchema.validate(values)).resolves.toBeDefined();
  const saved = getFinalValues(values, node);
  expect(saved.serviceConfig.ports).toEqual([
    {
      target: 80,
      published: "8080",
      host_ip: "::1",
      mode: "host",
      app_protocol: "http"
    }
  ]);
  expect(saved.serviceConfig.expose).toEqual(["9001/udp"]);
  expect(saved.kubernetes!.service!.ports[0]).toMatchObject({
    port: 81,
    nodePort: 30081
  });
  expect(getInitialValues(saved).exposedPorts).toEqual([
    { containerPort: "9001", protocol: "udp" }
  ]);
});

test.each(["1e2", "0x50", "1.2", "-1", "65536", ""])(
  "form rejects invalid Service port text %s",
  async (port) => {
    const node = graphNode(importedGraph([workload(), service()]));
    const values = getInitialValues(node);
    values.kubernetesService.ports[0].servicePort = port;
    await expect(validationSchema.validate(values)).rejects.toThrow();
  }
);

test("short IPv6 host edits and Kubernetes text reconciliation keep the Compose binding", () => {
  const node = Object.values(
    composeToCanvasGraph({
      services: { web: { image: "nginx", ports: ["[::1]:8080:80"] } }
    }).nodes
  )[0] as IServiceNodeItem;
  const values = getInitialValues(node);
  values.ports[0].containerPort = "81";
  const saved = getFinalValues(values, node);
  expect(saved.serviceConfig.ports).toEqual(["[::1]:8080:81"]);
  const imported = preserveComposeSettings(
    parseManifest(JSON.stringify([workload()]), "json"),
    { [node.key]: node }
  );
  expect(imported.data.services.web.ports).toEqual(["[::1]:8080:80"]);
});

test.each([
  "127.0.0.1",
  "0.0.0.0",
  "::",
  "::1",
  "2001:db8::1",
  "::ffff:192.0.2.1"
])("accepts host address %s", (value) => expect(isIPAddress(value)).toBe(true));
test.each([
  "256.0.0.1",
  "1.2.3",
  ":::1",
  "1:2:3",
  "1:2:3:4:5:6:7:8:9",
  "0.01.0.0",
  "localhost",
  "2001:db8::g"
])("rejects host address %s", (value) =>
  expect(isIPAddress(value)).toBe(false)
);

test("replacing the source with a Compose file clears native exposure while ordinary Compose edits keep it", () => {
  const graph = importedGraph([workload(), service()]);
  const imported = parseManifest("services:\n  web:\n    image: nginx", "yaml");
  const replaced = composeToCanvasGraph(
    imported.data,
    graph.nodes,
    graph.networks,
    imported.source,
    false
  );
  expect(
    (Object.values(replaced.nodes)[0] as IServiceNodeItem).kubernetes
  ).toBeUndefined();
  expect(
    (
      Object.values(
        composeToCanvasGraph(imported.data, graph.nodes).nodes
      )[0] as IServiceNodeItem
    ).kubernetes?.service?.type
  ).toBe("NodePort");
});

test("rejects invalid native Service types and malformed Compose exposure syntax", () => {
  const resources = [
    workload(),
    { ...service(), spec: { ...service().spec, type: "None" } }
  ];
  expect(
    render(generatePayload(importedGraph(resources))).diagnostics.some(
      (item) => item.code === "SERVICE_TYPE_INVALID"
    )
  ).toBe(true);
  for (const config of [{ expose: ["8080:80"] }, { ports: ["::1:8080:80"] }]) {
    const result = generateManifest(
      {
        data: {
          services: { web: { image: "nginx", ...config } },
          networks: {},
          volumes: {}
        }
      },
      manifestTypes.DOCKER_COMPOSE
    );
    expect(result.blocked).toBe(true);
  }
});
