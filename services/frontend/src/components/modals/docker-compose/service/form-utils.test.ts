import YAML from "yaml";
import { manifestTypes } from "../../../../constants";
import { generateManifest } from "../../../../services/generate";
import type { ContainerCommand, IServiceNodeItem } from "../../../../types";
import { generatePayload } from "../../../../utils/generators";
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
  expect(reopened.deploy.placement.preferences).toEqual([
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

  expect(reopened.deploy.placement.preferences).toEqual([
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
  expect(getInitialValues(node).deploy.placement.preferences).toEqual(
    values.deploy.placement.preferences
  );
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
