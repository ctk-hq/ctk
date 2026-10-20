import YAML from "yaml";
import { manifestTypes } from "../../../../constants";
import { generateManifest } from "../../../../services/generate";
import type { ContainerCommand, IServiceNodeItem } from "../../../../types";
import { generatePayload } from "../../../../utils/generators";
import { composeToCanvasGraph } from "../../../../utils/compose";
import {
  getFinalValues,
  getInitialValues,
  validationSchema
} from "./form-utils";

function serviceForm() {
  const values = structuredClone(getInitialValues());
  values.serviceName = "web";
  values.imageName = "nginx";
  values.imageTag = "alpine";
  values.deploy.replicas = "2";
  values.deploy.resources.limits.pids = "100";
  values.deploy.rollbackConfig.parallelism = "1";
  values.deploy.updateConfig.parallelism = "1";
  values.deploy.restartPolicy.condition = "on-failure";
  values.deploy.restartPolicy.maxAttempts = "3";
  values.deploy.placement.preferences = [
    { key: "spread", value: "node.labels.zone" }
  ];
  return values;
}

function composeDocument(node: IServiceNodeItem) {
  const payload = generatePayload({ nodes: { web: node }, networks: {} });
  const result = generateManifest(payload, manifestTypes.DOCKER_COMPOSE);
  expect(result.error).toBeUndefined();
  return YAML.parse(result.code);
}

test("an unrelated form edit preserves imported long syntax, native settings, and registry image references", () => {
  const config = {
    image: "registry.example.com:5000/team/app:1.2",
    user: "1000:1000",
    read_only: true,
    healthcheck: { test: ["CMD", "true"] },
    secrets: ["credentials"],
    configs: ["settings"],
    ports: [{ target: 80, published: "8080", host_ip: "127.0.0.1" }],
    volumes: [
      {
        type: "volume",
        source: "data",
        target: "/data",
        read_only: true,
        volume: { nocopy: true }
      }
    ],
    networks: { internal: { aliases: ["app"] } }
  };
  const graph = composeToCanvasGraph({ services: { app: config } });
  const node = Object.values(graph.nodes)[0] as IServiceNodeItem;
  const values = getInitialValues(node);
  expect(values.imageName).toBe("registry.example.com:5000/team/app");
  expect(values.imageTag).toBe("1.2");
  expect(values.volumes[0].containerPath).toBe("/data");
  expect(values.ports[0].containerPort).toBe("80");
  values.workingDir = "/srv/app";
  const saved = getFinalValues(values, node);
  expect(JSON.parse(JSON.stringify(saved.serviceConfig))).toEqual({
    ...config,
    working_dir: "/srv/app"
  });
});

test("an explicit form deletion removes only its selected field", () => {
  const node = getFinalValues(serviceForm());
  node.serviceConfig.working_dir = "/srv";
  node.serviceConfig.read_only = true;
  const values = getInitialValues(node);
  values.workingDir = "";
  const saved = getFinalValues(values, node);
  expect(composeDocument(saved).services.web.working_dir).toBeUndefined();
  expect(saved.serviceConfig.read_only).toBe(true);
});

test("saves, reopens, and exports capability lists to Compose and Kubernetes", async () => {
  const values = serviceForm();
  values.deploy = structuredClone(getInitialValues().deploy);
  values.capAdd = [" net_admin ", "CAP_SYS_TIME", "NET_ADMIN"];
  values.capDrop = ["cap_net_raw"];
  await expect(validationSchema.validate(values)).resolves.toBeDefined();

  const node = getFinalValues(values);
  const reopened = getInitialValues(node);
  expect(reopened.capAdd).toEqual(["NET_ADMIN", "SYS_TIME"]);
  expect(reopened.capDrop).toEqual(["NET_RAW"]);

  const saved = getFinalValues(reopened, node);
  const compose = composeDocument(saved).services.web;
  expect(compose.cap_add).toEqual(["NET_ADMIN", "SYS_TIME"]);
  expect(compose.cap_drop).toEqual(["NET_RAW"]);

  const result = generateManifest(
    generatePayload({ nodes: { web: saved }, networks: {} }),
    manifestTypes.KUBERNETES
  );
  expect(result.error).toBeUndefined();
  const deployment = YAML.parseAllDocuments(result.code)
    .map((doc) => doc.toJSON())
    .find((doc) => doc.kind === "Deployment");
  expect(
    deployment.spec.template.spec.containers[0].securityContext.capabilities
  ).toEqual({ add: ["NET_ADMIN", "SYS_TIME"], drop: ["NET_RAW"] });
});

test("omits unset capability lists and removes them when cleared in the editor", () => {
  const node = getFinalValues(serviceForm());
  expect(getInitialValues(node).capAdd).toEqual([]);
  expect(getInitialValues(node).capDrop).toEqual([]);
  expect(composeDocument(node).services.web).not.toHaveProperty("cap_add");
  expect(composeDocument(node).services.web).not.toHaveProperty("cap_drop");

  node.serviceConfig.cap_add = ["NET_ADMIN"];
  node.serviceConfig.cap_drop = ["ALL"];
  const reopened = getInitialValues(node);
  expect(reopened.capAdd).toEqual(["NET_ADMIN"]);
  expect(reopened.capDrop).toEqual(["ALL"]);
  reopened.capAdd = [];
  reopened.capDrop = [];

  const compose = composeDocument(getFinalValues(reopened, node)).services.web;
  expect(compose).not.toHaveProperty("cap_add");
  expect(compose).not.toHaveProperty("cap_drop");
});

test.each(["capAdd", "capDrop"] as const)(
  "rejects blank or malformed names in %s while accepting ALL",
  async (field) => {
    const values = serviceForm();
    for (const name of ["", "   ", "CAP_", "NET ADMIN", "NET-ADMIN"]) {
      values[field] = [name];
      await expect(validationSchema.validate(values)).rejects.toMatchObject({
        path: `${field}[0]`
      });
    }
    values[field] = ["ALL"];
    await expect(validationSchema.validate(values)).resolves.toBeDefined();
  }
);

test("serializes validated Deploy form settings through the graph into Compose YAML", async () => {
  const values = serviceForm();
  await expect(validationSchema.validate(values)).resolves.toBeDefined();

  const document = composeDocument(getFinalValues(values));

  expect(document.services.web.image).toBe("nginx:alpine");
  expect(document.services.web.deploy.restart_policy).toEqual({
    condition: "on-failure",
    max_attempts: 3
  });
  expect(document.services.web.deploy.placement.preferences).toEqual([
    { spread: "node.labels.zone" }
  ]);
});

test("reopens canonical Compose Deploy settings and preserves them when saved again", () => {
  const node = getFinalValues(serviceForm());
  node.serviceConfig.deploy = {
    placement: { preferences: [{ spread: "node.labels.zone" }] },
    restart_policy: { condition: "on-failure", max_attempts: 3 }
  };

  const reopened = getInitialValues(node);

  expect(reopened.deploy.restartPolicy.maxAttempts).toBe("3");
  expect(reopened.deploy.placement.preferences).toMatchObject([
    { key: "spread", value: "node.labels.zone" }
  ]);
  expect(composeDocument(getFinalValues(reopened, node))).toEqual(
    composeDocument(node)
  );
});

test("converts legacy saved string preferences to canonical preference objects", () => {
  const node = getFinalValues(serviceForm());
  // Older CTK projects stored preferences as strings instead of Compose objects.
  const legacyNode = {
    ...node,
    serviceConfig: {
      ...node.serviceConfig,
      deploy: {
        placement: { preferences: ["spread=node.labels.zone"] }
      }
    }
  } as unknown as IServiceNodeItem;

  const reopened = getInitialValues(legacyNode);

  expect(reopened.deploy.placement.preferences).toMatchObject([
    { key: "spread", value: "node.labels.zone" }
  ]);
  expect(
    composeDocument(getFinalValues(reopened, legacyNode)).services.web.deploy
      .placement.preferences
  ).toEqual([{ spread: "node.labels.zone" }]);
});

test("omits unset restart attempts and placement preferences from Compose YAML", () => {
  const values = serviceForm();
  values.deploy.restartPolicy.maxAttempts = "";
  values.deploy.placement.preferences = [];

  const deploy = composeDocument(getFinalValues(values)).services.web.deploy;

  expect(deploy.restart_policy).toEqual({ condition: "on-failure" });
  expect(deploy).not.toHaveProperty("placement");
});

test("preserves zero restart attempts and ordered preferences with repeated strategy keys", () => {
  const values = serviceForm();
  values.deploy.restartPolicy.maxAttempts = "0";
  values.deploy.placement.preferences.push({
    key: "spread",
    value: "node.labels.rack"
  });

  const node = getFinalValues(values);
  const deploy = composeDocument(node).services.web.deploy;

  expect(deploy.restart_policy.max_attempts).toBe(0);
  expect(deploy.placement.preferences).toEqual([
    { spread: "node.labels.zone" },
    { spread: "node.labels.rack" }
  ]);
  expect(
    getInitialValues(node).deploy.placement.preferences.map(
      ({ key, value }) => ({ key, value })
    )
  ).toEqual(values.deploy.placement.preferences);
});

test.each<{
  command: ContainerCommand;
  entrypoint: ContainerCommand;
  executable: string[] | undefined;
  args: string[] | undefined;
}>([
  { command: null, entrypoint: null, executable: undefined, args: undefined },
  {
    command: ["--one=a,b", "two words", ""],
    entrypoint: null,
    executable: undefined,
    args: ["--one=a,b", "two words", ""]
  },
  {
    command: "--message='two words'\n--one=a,b",
    entrypoint: null,
    executable: undefined,
    args: ["--message=two words", "--one=a,b"]
  },
  {
    command: ["-c", "echo first\nexec app"],
    entrypoint: ["sh"],
    executable: ["sh"],
    args: ["-c", "echo first\nexec app"]
  },
  {
    command: "-c 'echo first && exec app'",
    entrypoint: "sh",
    executable: ["sh"],
    args: ["-c", "echo first && exec app"]
  },
  { command: [], entrypoint: ["/app"], executable: ["/app"], args: undefined },
  {
    command: ["/app", "--verbose"],
    entrypoint: [],
    executable: ["/app", "--verbose"],
    args: undefined
  }
])(
  "preserves command/entrypoint types through form edits and both manifest generators: $command / $entrypoint",
  async ({ command, entrypoint, executable, args }) => {
    const values = serviceForm();
    values.deploy = structuredClone(getInitialValues().deploy);
    values.command = command;
    values.entrypoint = entrypoint;
    await expect(validationSchema.validate(values)).resolves.toBeDefined();
    const node = getFinalValues(values);
    const reopened = getInitialValues(node);
    expect(reopened.command).toEqual(command);
    expect(reopened.entrypoint).toEqual(entrypoint);
    const saved = getFinalValues(reopened, node);
    const compose = composeDocument(saved).services.web;
    expect(compose.command).toEqual(command === null ? undefined : command);
    expect(compose.entrypoint).toEqual(
      entrypoint === null ? undefined : entrypoint
    );
    const result = generateManifest(
      generatePayload({ nodes: { web: saved }, networks: {} }),
      manifestTypes.KUBERNETES
    );
    expect(result.error).toBeUndefined();
    const deployment = YAML.parseAllDocuments(result.code)
      .map((doc) => doc.toJSON())
      .find((doc) => doc.kind === "Deployment");
    const container = deployment.spec.template.spec.containers[0];
    expect(container.command).toEqual(executable);
    expect(container.args).toEqual(args);
  }
);

test("keeps an explicit empty Compose command and reports an unrepresentable Kubernetes override", () => {
  const values = serviceForm();
  values.command = [];
  const node = getFinalValues(values);
  expect(composeDocument(node).services.web.command).toEqual([]);
  const result = generateManifest(
    generatePayload({ nodes: { web: node }, networks: {} }),
    manifestTypes.KUBERNETES
  );
  expect(result.code).toBe("");
  expect(result.error).toContain('Service "web"');
  expect(result.error).toContain("cannot clear the image command");
});
