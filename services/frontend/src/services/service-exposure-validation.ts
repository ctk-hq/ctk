import type { KubernetesServiceConfig } from "../types/service-exposure";
import { validPort } from "../utils/service-ports";

export interface ExposureIssue {
  code: string;
  path: string;
  reason: string;
}
const dnsLabel = (value: string) =>
  value.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value);
export const namedTarget = (value: string) =>
  value.length <= 15 && dnsLabel(value) && /[a-z]/.test(value);
const appProtocol = (value: string) => {
  const parts = value.split("/");
  const name = parts.at(-1)!;
  return (
    parts.length <= 2 &&
    name.length <= 63 &&
    /^[a-zA-Z0-9](?:[a-zA-Z0-9_.-]*[a-zA-Z0-9])?$/.test(name) &&
    (parts.length === 1 ||
      (parts[0].length <= 253 && parts[0].split(".").every(dnsLabel)))
  );
};

/** Checks shared by form authoring and native/generated manifest validation. */
export function serviceExposureIssues(
  settings: KubernetesServiceConfig
): ExposureIssue[] {
  const issues: ExposureIssue[] = [];
  const add = (code: string, path: string, reason: string) =>
    issues.push({ code, path, reason });
  if (
    !["None", "ClusterIP", "NodePort", "LoadBalancer"].includes(settings.type)
  )
    add(
      "SERVICE_TYPE_INVALID",
      "/type",
      "Choose ClusterIP, NodePort, LoadBalancer or no Service."
    );
  if (settings.type === "None") return issues;
  if (!Array.isArray(settings.ports) || !settings.ports.length) {
    add(
      "SERVICE_PORT_REQUIRED",
      "/ports",
      "A Service needs at least one port."
    );
    return issues;
  }
  const keys = new Set<string>(),
    names = new Set<string>(),
    nodes = new Set<string>();
  settings.ports.forEach((port, index) => {
    const path = `/ports/${index}`;
    if (!Number.isInteger(port.port) || !validPort(port.port))
      add(
        "SERVICE_PORT_INVALID",
        `${path}/port`,
        "Service ports must be whole numbers from 1 to 65535."
      );
    const key = `${port.port}/${port.protocol}`;
    if (keys.has(key))
      add(
        "SERVICE_PORT_DUPLICATE",
        `${path}/port`,
        "Service port/protocol pairs must be unique."
      );
    keys.add(key);
    if (!["TCP", "UDP", "SCTP"].includes(port.protocol))
      add("PORT_PROTOCOL", `${path}/protocol`, "Choose TCP, UDP or SCTP.");
    if (
      typeof port.targetPort === "number"
        ? !Number.isInteger(port.targetPort) || !validPort(port.targetPort)
        : typeof port.targetPort !== "string" || !namedTarget(port.targetPort)
    )
      add(
        "SERVICE_TARGET_INVALID",
        `${path}/targetPort`,
        "Use a target port from 1 to 65535 or a valid container port name."
      );
    if (
      (!port.name && settings.ports.length > 1) ||
      (port.name && (!dnsLabel(port.name) || names.has(port.name)))
    )
      add(
        "PORT_NAME_INVALID",
        `${path}/name`,
        "Use a unique lowercase Service port name; names are required with multiple ports."
      );
    if (port.name) names.add(port.name);
    if (port.appProtocol !== undefined && !appProtocol(port.appProtocol))
      add(
        "APP_PROTOCOL_INVALID",
        `${path}/appProtocol`,
        "Use an application protocol such as http or kubernetes.io/h2c."
      );
    if (port.nodePort !== undefined) {
      if (settings.type === "ClusterIP")
        add(
          "NODE_PORT_FORBIDDEN",
          `${path}/nodePort`,
          "ClusterIP Services cannot allocate node ports."
        );
      if (!Number.isInteger(port.nodePort) || !validPort(port.nodePort))
        add(
          "NODE_PORT_INVALID",
          `${path}/nodePort`,
          "Use a node port from the cluster's configured range, or leave it blank for automatic allocation."
        );
      const key = `${port.nodePort}/${port.protocol}`;
      if (nodes.has(key))
        add(
          "NODE_PORT_DUPLICATE",
          `${path}/nodePort`,
          "Node port/protocol pairs must be unique."
        );
      nodes.add(key);
    }
  });
  return issues;
}
