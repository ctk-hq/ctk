import YAML from "yaml";
import { manifestTypes } from "../../../../constants";
import { generateManifest } from "../../../../services/generate";
import type { IServiceNodeItem } from "../../../../types";
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
