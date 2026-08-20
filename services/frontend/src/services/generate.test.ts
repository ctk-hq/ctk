import YAML from "yaml";

import { manifestTypes } from "../constants";
import { IGeneratePayload } from "../types";
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
