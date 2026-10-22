import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { generateManifest } from "../../src/services/generate";
import { manifestTypes } from "../../src/constants";
import type { IGeneratePayload, IServiceNodeItem } from "../../src/types";
import type { KubernetesServiceConfig } from "../../src/types/service-exposure";
import { parseManifest } from "../../src/utils/manifests";
import { composeToCanvasGraph } from "../../src/utils/compose";
import { generatePayload } from "../../src/utils/generators";
import {
  getFinalValues,
  getInitialValues
} from "../../src/components/modals/docker-compose/service/form-utils";

const enabled = process.env.CTK_KUBERNETES_RUNTIME === "1";
const kind = process.env.CTK_KIND_BIN || "kind";
const nodeImage =
  "kindest/node:v1.35.0@sha256:452d707d4862f52530247495d180205e029056831160e22870e37e3f6c1ac31f";
const appImage = "busybox:1.37.0";
const marker = "ctk-service-traffic-ok";

// No current-context fallback: every cluster operation uses this disposable
// cluster's private kubeconfig and explicit context, including failure cleanup.
describe
  .skipIf(!enabled)
  .sequential("Kubernetes Service traffic (disposable kind cluster)", () => {
    const cluster = `ctk-traffic-${randomUUID().slice(0, 8)}`;
    let directory: string, kubeconfig: string, hostPort: number;
    let creationStarted = false;
    const run = (
      binary: string,
      args: string[],
      input?: string,
      timeout = 120_000
    ) =>
      execFileSync(binary, args, {
        encoding: "utf8",
        input,
        timeout,
        stdio: ["pipe", "pipe", "pipe"]
      });
    const kube = (args: string[], input?: string) =>
      run(
        "kubectl",
        ["--kubeconfig", kubeconfig, "--context", `kind-${cluster}`, ...args],
        input
      );
    const payload = (
      name: string,
      settings: KubernetesServiceConfig
    ): IGeneratePayload => ({
      kubernetesServices: { [name]: settings },
      data: {
        services: {
          [name]: {
            image: appImage,
            entrypoint: ["sh", "-ec"],
            command: [
              `mkdir -p /www; printf '${marker}' > /www/index.html; exec httpd -f -p 8080 -h /www`
            ],
            expose: ["8080"]
          }
        },
        volumes: {},
        networks: {}
      }
    });
    const code = (input: IGeneratePayload) => {
      const generated = generateManifest(input, manifestTypes.KUBERNETES);
      expect(generated.error).toBeUndefined();
      return generated.code;
    };
    const apply = (manifest: string) => {
      kube(["apply", "--dry-run=server", "-f", "-"], manifest);
      kube(["apply", "-f", "-"], manifest);
    };
    const ready = (name: string) =>
      kube(["rollout", "status", `deployment/${name}`, "--timeout=90s"]);
    const request = (url: string) =>
      kube(["exec", "traffic", "--", "wget", "-qO-", "-T", "5", url]);

    beforeAll(async () => {
      run(kind, ["version"]);
      run("docker", ["info", "--format", "{{.ServerVersion}}"]);
      directory = mkdtempSync(join(tmpdir(), "ctk-service-traffic-"));
      kubeconfig = join(directory, "kubeconfig");
      const listener = createServer();
      await new Promise<void>((resolve, reject) => {
        listener.once("error", reject);
        listener.listen(0, "127.0.0.1", resolve);
      });
      hostPort = (listener.address() as { port: number }).port;
      await new Promise<void>((resolve) => listener.close(() => resolve()));
      const config = join(directory, "kind.json");
      writeFileSync(
        config,
        JSON.stringify({
          kind: "Cluster",
          apiVersion: "kind.x-k8s.io/v1alpha4",
          nodes: [
            {
              role: "control-plane",
              extraPortMappings: [
                {
                  containerPort: 30080,
                  hostPort,
                  listenAddress: "127.0.0.1",
                  protocol: "TCP"
                }
              ]
            }
          ]
        })
      );
      process.stdout.write(`Creating isolated cluster ${cluster}\n`);
      creationStarted = true;
      run(
        kind,
        [
          "create",
          "cluster",
          "--name",
          cluster,
          "--image",
          nodeImage,
          "--config",
          config,
          "--kubeconfig",
          kubeconfig,
          "--wait",
          "90s"
        ],
        undefined,
        240_000
      );
      kube([
        "run",
        "traffic",
        "--image",
        appImage,
        "--restart=Never",
        "--command",
        "--",
        "sleep",
        "600"
      ]);
      kube(["wait", "--for=condition=Ready", "pod/traffic", "--timeout=90s"]);
    });

    afterAll(() => {
      try {
        if (creationStarted)
          run(
            kind,
            [
              "delete",
              "cluster",
              "--name",
              cluster,
              "--kubeconfig",
              kubeconfig
            ],
            undefined,
            60_000
          );
      } finally {
        if (directory) rmSync(directory, { recursive: true, force: true });
      }
    });

    test("validates authored IPv6 bindings, internal ports and protocols with Docker Compose", () => {
      const graph = composeToCanvasGraph({
        services: { web: { image: appImage } }
      });
      const node = Object.values(graph.nodes)[0] as IServiceNodeItem;
      const values = getInitialValues(node);
      values.ports = [
        {
          hostIP: "::1",
          hostPort: "8080",
          containerPort: "80",
          protocol: "tcp"
        },
        { hostPort: "5353", containerPort: "53", protocol: "udp" }
      ];
      values.exposedPorts = [
        { containerPort: "9000", protocol: "tcp" },
        { containerPort: "5000", protocol: "sctp" }
      ];
      graph.nodes[node.key] = getFinalValues(values, node);
      const generated = generateManifest(
        generatePayload(graph),
        manifestTypes.DOCKER_COMPOSE
      );
      expect(generated.error).toBeUndefined();
      expect(
        run(
          "docker",
          [
            "compose",
            "--project-name",
            "ctk-traffic-config",
            "-f",
            "-",
            "config",
            "--quiet"
          ],
          generated.code
        )
      ).toBe("");
    });

    test("routes internal Service traffic through a distinct Service and target port", async () => {
      apply(
        code(
          payload("internal", {
            type: "ClusterIP",
            ports: [{ port: 81, targetPort: 8080, protocol: "TCP" }]
          })
        )
      );
      ready("internal");
      await expect
        .poll(() => request("http://internal:81"), { timeout: 30_000 })
        .toBe(marker);
      expect(
        JSON.parse(kube(["get", "service/internal", "-o", "json"])).spec
          .ports[0].nodePort
      ).toBeUndefined();
    });

    test("reaches a fixed NodePort from the host and retains traffic after import/form/save/edit", async () => {
      const manifest = code(
        payload("web", {
          type: "NodePort",
          ports: [
            {
              name: "http",
              port: 81,
              targetPort: 8080,
              protocol: "TCP",
              nodePort: 30080
            }
          ]
        })
      );
      apply(manifest);
      ready("web");
      await expect
        .poll(
          async () =>
            (
              await fetch(`http://127.0.0.1:${hostPort}`, {
                signal: AbortSignal.timeout(5000)
              })
            ).text(),
          { timeout: 30_000 }
        )
        .toBe(marker);
      const imported = parseManifest(manifest, "yaml");
      const graph = {
        ...composeToCanvasGraph(imported.data, {}, {}, imported.source),
        manifestSource: imported.source
      };
      const node = Object.values(graph.nodes)[0] as IServiceNodeItem;
      const values = getInitialValues(node);
      values.kubernetesService.ports[0].servicePort = "82";
      values.kubernetesService.ports[0].targetPort =
        imported.source.kubernetes!.documents.find(
          (resource) => resource.kind === "Deployment"
        )!.spec.template.spec.containers[0].ports[0].name;
      graph.nodes[node.key] = getFinalValues(values, node);
      apply(code(generatePayload(JSON.parse(JSON.stringify(graph)))));
      await expect
        .poll(() => request("http://web:82"), { timeout: 30_000 })
        .toBe(marker);
      expect(
        await (
          await fetch(`http://127.0.0.1:${hostPort}`, {
            signal: AbortSignal.timeout(5000)
          })
        ).text()
      ).toBe(marker);
    });

    test("allocates a NodePort and routes node-address traffic", async () => {
      apply(
        code(
          payload("automatic", {
            type: "NodePort",
            ports: [{ port: 83, targetPort: 8080, protocol: "TCP" }]
          })
        )
      );
      ready("automatic");
      const assigned = JSON.parse(
        kube(["get", "service/automatic", "-o", "json"])
      ).spec.ports[0].nodePort;
      const node = JSON.parse(kube(["get", "nodes", "-o", "json"])).items[0];
      const ip = node.status.addresses.find(
        (address: { type: string }) => address.type === "InternalIP"
      ).address;
      expect(assigned).toBeGreaterThan(0);
      await expect
        .poll(() => request(`http://${ip}:${assigned}`), { timeout: 30_000 })
        .toBe(marker);
    });

    test("server-validates LoadBalancer without provisioning one, and omits a Service when requested", () => {
      const loadBalancer = code(
        payload("provider", {
          type: "LoadBalancer",
          ports: [{ port: 80, targetPort: 8080, protocol: "TCP" }]
        })
      );
      expect(
        kube(["apply", "--dry-run=server", "-f", "-"], loadBalancer)
      ).toContain("service/provider");
      apply(code(payload("private", { type: "None", ports: [] })));
      ready("private");
      expect(
        kube(["get", "service/private", "--ignore-not-found", "-o", "name"])
      ).toBe("");
    });
  });
