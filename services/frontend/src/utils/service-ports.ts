import type {
  KubernetesServiceConfig,
  KubernetesServicePort,
  PortProtocol
} from "../types/service-exposure";
import { portParts } from "./container-values";

export const validPort = (value: unknown): boolean =>
  /^\d+$/.test(String(value)) && Number(value) >= 1 && Number(value) <= 65535;

export const portName = (
  port: number,
  protocol: string,
  index: number
): string => {
  const ending = `-${index}`;
  return `${`port-${port}-${protocol.toLowerCase()}`.slice(0, 15 - ending.length).replace(/-+$/, "")}${ending}`;
};

/** The legacy default stays internal. Explicit settings own Service ports. */
export function servicePorts(
  service: Record<string, any>,
  settings?: KubernetesServiceConfig
): KubernetesServicePort[] {
  if (settings) return settings.type === "None" ? [] : settings.ports;
  const ports = new Map<string, KubernetesServicePort>();
  for (const value of [...(service.ports ?? []), ...(service.expose ?? [])]) {
    const parts = portParts(value);
    if (!validPort(parts.containerPort)) continue;
    const port = validPort(parts.hostPort)
      ? Number(parts.hostPort)
      : Number(parts.containerPort);
    const protocol = (parts.protocol || "tcp").toUpperCase() as PortProtocol;
    const key = `${port}/${parts.containerPort}/${protocol}`;
    if (!ports.has(key))
      ports.set(key, {
        name: portName(Number(parts.containerPort), protocol, ports.size),
        port,
        targetPort: Number(parts.containerPort),
        protocol
      });
  }
  return [...ports.values()];
}

export function containerPorts(
  service: Record<string, any>,
  settings?: KubernetesServiceConfig
) {
  const ports = new Map<
    string,
    { name: string; containerPort: number; protocol: PortProtocol }
  >();
  const entries = [
    ...[...(service.ports ?? []), ...(service.expose ?? [])].map((value) => {
      const parts = portParts(value);
      return {
        targetPort: Number(parts.containerPort),
        protocol: (parts.protocol || "tcp").toUpperCase() as PortProtocol
      };
    }),
    ...(settings?.type === "None" ? [] : (settings?.ports ?? []))
  ];
  for (const entry of entries) {
    if (typeof entry.targetPort !== "number" || !validPort(entry.targetPort))
      continue;
    const key = `${entry.targetPort}/${entry.protocol}`;
    if (!ports.has(key))
      ports.set(key, {
        name: portName(entry.targetPort, entry.protocol, 0),
        containerPort: entry.targetPort,
        protocol: entry.protocol
      });
  }
  return [...ports.values()];
}
