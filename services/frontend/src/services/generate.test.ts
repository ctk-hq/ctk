import YAML from "yaml";

import { manifestTypes } from "../constants";
import { IGeneratePayload } from "../types";
import { composeToCanvasGraph } from "../utils/compose";
import { generatePayload } from "../utils/generators";
import {
  generateDockerCompose,
  generateKubernetes,
  generateManifest
} from "./generate";

const payload: IGeneratePayload = {
  data: {
    services: {
      web: {
        image: "nginx:alpine",
        environment: { NODE_ENV: "production" },
        ports: ["8080:80"],
        volumes: ["assets:/usr/share/nginx/html:ro"],
        deploy: { replicas: 2 }
      }
    },
    volumes: {
      assets: { name: "assets" }
    },
    networks: {
      frontend: { driver: "bridge" }
    }
  }
};

test("serializes a modern Compose document without a legacy version key", () => {
  const code = generateDockerCompose(payload.data);
  const document = YAML.parse(code);

  expect(document.version).toBeUndefined();
  expect(document.services.web.image).toBe("nginx:alpine");
  expect(document.networks.frontend.driver).toBe("bridge");
  expect(document.volumes.assets.name).toBe("assets");
});

test("ignores legacy version metadata when generating Compose", () => {
  const legacyInput = {
    ...payload.data,
    version: "3.8"
  } as unknown as IGeneratePayload["data"];
  const document = YAML.parse(generateDockerCompose(legacyInput));

  expect(document.version).toBeUndefined();
  expect(document.services.web.image).toBe("nginx:alpine");
});

test("converts services, ports, environment, and volumes to Kubernetes", () => {
  const documents = YAML.parseAllDocuments(
    generateKubernetes(payload.data)
  ).map((document) => document.toJSON());
  const deployment = documents.find(
    (document) => document.kind === "Deployment"
  );
  const service = documents.find((document) => document.kind === "Service");
  const claim = documents.find(
    (document) => document.kind === "PersistentVolumeClaim"
  );

  expect(deployment.spec.replicas).toBe(2);
  expect(deployment.spec.template.spec.containers[0]).toMatchObject({
    image: "nginx:alpine",
    env: [{ name: "NODE_ENV", value: "production" }],
    ports: [{ containerPort: 80, protocol: "TCP" }],
    volumeMounts: [
      { name: "assets", mountPath: "/usr/share/nginx/html", readOnly: true }
    ]
  });
  expect(service.spec.ports[0]).toMatchObject({ port: 8080, targetPort: 80 });
  expect(claim.metadata.name).toBe("assets");
});

test("selects Kubernetes generation without making an HTTP request", () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  const result = generateManifest(payload, manifestTypes.KUBERNETES);

  expect(result.error).toBeUndefined();
  expect(result.code).toContain("kind: Deployment");
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
});

const repeatedSources = {
  services: {
    web: {
      image: "nginx:alpine",
      volumes: ["assets:/one:ro", "assets:/two:ro"],
      ports: ["8080:80", "8081:80"]
    }
  },
  volumes: { assets: {} }
};

function generateFromCompose(input: unknown) {
  const payload = generatePayload(composeToCanvasGraph(input));
  const result = generateManifest(payload, manifestTypes.KUBERNETES);
  expect(result.error).toBeUndefined();
  const documents = YAML.parseAllDocuments(result.code).map((document) =>
    document.toJSON()
  );
  const deployment = documents.find(
    (document) => document.kind === "Deployment"
  );
  const service = documents.find((document) => document.kind === "Service");

  return { payload, documents, pod: deployment.spec.template.spec, service };
}

test("reuses a Pod volume and container port while retaining repeated mounts and Service mappings", () => {
  const { pod, service, documents } = generateFromCompose(repeatedSources);

  expect(pod.volumes).toEqual([
    { name: "assets", persistentVolumeClaim: { claimName: "assets" } }
  ]);
  expect(pod.containers[0].volumeMounts).toEqual([
    { name: "assets", mountPath: "/one", readOnly: true },
    { name: "assets", mountPath: "/two", readOnly: true }
  ]);
  expect(pod.containers[0].ports).toEqual([
    { name: "port-80-tcp-0", containerPort: 80, protocol: "TCP" }
  ]);
  expect(service.spec.ports).toEqual([
    { name: "port-80-tcp-0", port: 8080, targetPort: 80, protocol: "TCP" },
    { name: "port-80-tcp-1", port: 8081, targetPort: 80, protocol: "TCP" }
  ]);
  expect(
    documents.filter((document) => document.kind === "PersistentVolumeClaim")
  ).toHaveLength(1);
});

test.each([
  {
    kind: "named volume",
    mounts: [
      "assets:/one:ro",
      { type: "volume", source: "assets", target: "/two" }
    ],
    source: { persistentVolumeClaim: { claimName: "assets" } }
  },
  {
    kind: "bind mount",
    mounts: [
      "/data/assets:/one:ro",
      { type: "bind", source: "/data/assets", target: "/two" }
    ],
    source: {
      hostPath: { path: "/data/assets", type: "DirectoryOrCreate" }
    }
  }
])(
  "shares a $kind across short and long syntax with per-mount read-only settings",
  ({ mounts, source }) => {
    const { pod } = generateFromCompose({
      services: { web: { image: "nginx:alpine", volumes: mounts } },
      volumes: { assets: {} }
    });

    expect(pod.volumes).toHaveLength(1);
    expect(pod.volumes[0]).toMatchObject(source);
    const name = pod.volumes[0].name;
    expect(pod.containers[0].volumeMounts).toEqual([
      { name, mountPath: "/one", readOnly: true },
      { name, mountPath: "/two" }
    ]);
  }
);

test.each([
  ["/data/a_b", "/data/a-b"],
  [`/data/${"a".repeat(70)}1`, `/data/${"a".repeat(70)}2`]
])(
  "keeps bind sources %s and %s distinct when their normalized names collide",
  (firstSource, secondSource) => {
    const { pod } = generateFromCompose({
      services: {
        web: {
          image: "nginx:alpine",
          volumes: [
            `${firstSource}:/one`,
            `${secondSource}:/two`,
            `${firstSource}:/three:ro`
          ]
        }
      }
    });
    expect(pod.volumes).toHaveLength(2);
    const [first, second] = pod.volumes;
    expect(first.hostPath.path).toBe(firstSource);
    expect(second.hostPath.path).toBe(secondSource);
    expect(first.name).not.toBe(second.name);
    expect(first.name.length).toBeLessThanOrEqual(63);
    expect(second.name.length).toBeLessThanOrEqual(63);
    expect(pod.containers[0].volumeMounts).toEqual([
      { name: first.name, mountPath: "/one" },
      { name: second.name, mountPath: "/two" },
      { name: first.name, mountPath: "/three", readOnly: true }
    ]);
  }
);

test("keeps a bind source and a named volume with the same source text separate", () => {
  const { pod } = generateFromCompose({
    services: {
      web: {
        image: "nginx:alpine",
        volumes: [
          "assets:/one",
          { type: "bind", source: "assets", target: "/two" }
        ]
      }
    },
    volumes: { assets: {} }
  });

  expect(pod.volumes).toHaveLength(2);
  expect(pod.volumes[0].name).not.toBe(pod.volumes[1].name);
  expect(pod.volumes[0].persistentVolumeClaim).toEqual({ claimName: "assets" });
  expect(pod.volumes[1].hostPath).toEqual({
    path: "/workspace/assets",
    type: "DirectoryOrCreate"
  });
});

test("keeps anonymous volumes separate when their target names normalize identically", () => {
  const { pod } = generateFromCompose({
    services: {
      web: { image: "nginx:alpine", volumes: ["/a_b", "/a-b"] }
    }
  });
  expect(pod.volumes).toHaveLength(2);
  expect(pod.volumes[0].name).not.toBe(pod.volumes[1].name);
  expect(pod.volumes.every((volume: any) => volume.emptyDir)).toBe(true);
  expect(pod.containers[0].volumeMounts).toEqual([
    { name: pod.volumes[0].name, mountPath: "/a_b" },
    { name: pod.volumes[1].name, mountPath: "/a-b" }
  ]);
});

test("deduplicates container ports by target and protocol across published and exposed ports", () => {
  const { pod, service } = generateFromCompose({
    services: {
      web: {
        image: "nginx:alpine",
        ports: [
          "8080:80/tcp",
          { target: 80, published: 8081, protocol: "tcp" },
          "8082:80/udp",
          "8083:80/sctp"
        ],
        expose: ["80/tcp", "80/udp"]
      }
    }
  });
  const ports = pod.containers[0].ports;
  expect(ports).toHaveLength(3);
  expect(ports.map((port: any) => [port.containerPort, port.protocol])).toEqual(
    [
      [80, "TCP"],
      [80, "UDP"],
      [80, "SCTP"]
    ]
  );
  expect(new Set(ports.map((port: any) => port.name)).size).toBe(3);
  expect(
    service.spec.ports.map((port: any) => [
      port.port,
      port.targetPort,
      port.protocol
    ])
  ).toEqual([
    [8080, 80, "TCP"],
    [8081, 80, "TCP"],
    [8082, 80, "UDP"],
    [8083, 80, "SCTP"],
    [80, 80, "TCP"],
    [80, 80, "UDP"]
  ]);
});

test("preserves the original repeated mounts and port mappings when generating Compose", () => {
  const { payload } = generateFromCompose(repeatedSources);
  const result = generateManifest(payload, manifestTypes.DOCKER_COMPOSE);

  expect(result.error).toBeUndefined();
  expect(YAML.parse(result.code).services.web).toEqual(
    repeatedSources.services.web
  );
});

test("keeps generated port names valid and unique for five-digit targets and many mappings", () => {
  const { pod, service } = generateFromCompose({
    services: {
      web: {
        image: "nginx:alpine",
        ports: Array.from({ length: 12 }, (_, index) => `${8080 + index}:27017`)
      }
    }
  });
  const containerPorts = pod.containers[0].ports;
  expect(containerPorts).toHaveLength(1);
  expect(service.spec.ports).toHaveLength(12);
  expect(new Set(service.spec.ports.map((port: any) => port.name)).size).toBe(
    12
  );
  for (const port of [...containerPorts, ...service.spec.ports]) {
    expect(port.name.length).toBeLessThanOrEqual(15);
    expect(port.name).toMatch(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/);
    expect(port.name).toMatch(/[a-z]/);
  }
});
