import YAML from "yaml";

import { manifestTypes } from "../constants";
import { IGeneratePayload } from "../types";

type ManifestType = (typeof manifestTypes)[keyof typeof manifestTypes];
type ComposeData = IGeneratePayload["data"];
type UnknownRecord = Record<string, any>;

export interface GenerateResult {
  code: string;
  error?: string;
}

const isRecord = (value: unknown): value is UnknownRecord =>
  Boolean(value) && value?.constructor === Object;

const asRecord = (value: unknown): UnknownRecord =>
  isRecord(value) ? value : {};

const compactRecord = (value: UnknownRecord): UnknownRecord =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  );

const stringifyYamlDocument = (document: UnknownRecord): string =>
  `---\n${YAML.stringify(document, { indent: 2, lineWidth: 0 }).trimEnd()}\n`;

export const generateDockerCompose = (data: ComposeData): string => {
  const document: UnknownRecord = { services: data.services };

  if (Object.keys(data.networks).length > 0) {
    document.networks = data.networks;
  }

  if (Object.keys(data.volumes).length > 0) {
    document.volumes = data.volumes;
  }

  return stringifyYamlDocument(document);
};

const kubernetesName = (value: string, fallback = "app"): string => {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
    .slice(0, 63)
    .replace(/[^a-z0-9]+$/g, "");

  return normalized || fallback;
};

const portName = (port: number, protocol: string, index: number): string =>
  `port-${port}-${protocol || "tcp"}-${index}`.slice(0, 15);

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (typeof value === "string" && value.trim()) {
    return [value];
  }

  return [];
};

const toLabels = (value: unknown): Record<string, string> => {
  if (Array.isArray(value)) {
    return Object.fromEntries(
      value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => {
          const separator = entry.indexOf("=");
          return separator === -1
            ? [entry, ""]
            : [entry.slice(0, separator), entry.slice(separator + 1)];
        })
    );
  }

  return Object.fromEntries(
    Object.entries(asRecord(value)).map(([key, entry]) => [key, String(entry)])
  );
};

const toEnvironment = (
  value: unknown
): Array<{ name: string; value: string }> => {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => {
        const separator = entry.indexOf("=");
        return separator === -1
          ? { name: entry, value: "" }
          : {
              name: entry.slice(0, separator),
              value: entry.slice(separator + 1)
            };
      })
      .filter((entry) => entry.name.length > 0);
  }

  return Object.entries(asRecord(value)).map(([name, entry]) => ({
    name,
    value: entry === null || entry === undefined ? "" : String(entry)
  }));
};

interface ParsedPort {
  target: number;
  published: number;
  protocol: "TCP" | "UDP" | "SCTP";
}

const parsePortNumber = (value: unknown): number | null => {
  const match = String(value ?? "").match(/^\d+/);
  if (!match) {
    return null;
  }

  const port = Number(match[0]);
  return port >= 1 && port <= 65535 ? port : null;
};

const normalizeProtocol = (value: unknown): ParsedPort["protocol"] => {
  const protocol = String(value ?? "tcp").toUpperCase();
  return protocol === "UDP" || protocol === "SCTP" ? protocol : "TCP";
};

const parsePort = (value: unknown): ParsedPort | null => {
  if (isRecord(value)) {
    const target = parsePortNumber(value.target);
    if (!target) {
      return null;
    }

    return {
      target,
      published: parsePortNumber(value.published) ?? target,
      protocol: normalizeProtocol(value.protocol)
    };
  }

  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const [portExpression, protocol] = String(value).split("/");
  const segments = portExpression.split(":");
  const target = parsePortNumber(segments.at(-1));

  if (!target) {
    return null;
  }

  return {
    target,
    published:
      segments.length > 1
        ? (parsePortNumber(segments.at(-2)) ?? target)
        : target,
    protocol: normalizeProtocol(protocol)
  };
};

const getPorts = (service: UnknownRecord): ParsedPort[] => {
  const values = [
    ...(Array.isArray(service.ports) ? service.ports : []),
    ...toStringArray(service.expose)
  ];
  const deduplicated = new Map<string, ParsedPort>();

  values.forEach((value) => {
    const parsed = parsePort(value);
    if (parsed) {
      deduplicated.set(
        `${parsed.published}:${parsed.target}:${parsed.protocol}`,
        parsed
      );
    }
  });

  return [...deduplicated.values()];
};

const splitCommand = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (typeof value === "string" && value.trim()) {
    return ["/bin/sh", "-c", value];
  }

  return undefined;
};

const durationSeconds = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    return Math.max(1, Math.ceil(value));
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const match = value.trim().match(/^(\d+(?:\.\d+)?)(ms|s|m|h)?$/);
  if (!match) {
    return undefined;
  }

  const amount = Number(match[1]);
  const multipliers: Record<string, number> = {
    ms: 0.001,
    s: 1,
    m: 60,
    h: 3600
  };

  return Math.max(1, Math.ceil(amount * (multipliers[match[2] || "s"] ?? 1)));
};

const toHealthProbe = (value: unknown): UnknownRecord | undefined => {
  const healthcheck = asRecord(value);
  const test = toStringArray(healthcheck.test);

  if (test.length === 0 || test[0] === "NONE") {
    return undefined;
  }

  const command =
    test[0] === "CMD-SHELL"
      ? ["/bin/sh", "-c", test.slice(1).join(" ")]
      : test[0] === "CMD"
        ? test.slice(1)
        : test;

  return compactRecord({
    exec: { command },
    periodSeconds: durationSeconds(healthcheck.interval),
    timeoutSeconds: durationSeconds(healthcheck.timeout),
    failureThreshold:
      typeof healthcheck.retries === "number" ? healthcheck.retries : undefined,
    initialDelaySeconds: durationSeconds(healthcheck.start_period)
  });
};

const imagePullPolicy = (pullPolicy: unknown): string | undefined => {
  switch (String(pullPolicy ?? "").toLowerCase()) {
    case "always":
      return "Always";
    case "never":
      return "Never";
    case "missing":
    case "if_not_present":
    case "if-not-present":
      return "IfNotPresent";
    default:
      return undefined;
  }
};

const toResources = (value: unknown): UnknownRecord | undefined => {
  const resources = asRecord(value);
  const limits = asRecord(resources.limits);
  const reservations = asRecord(resources.reservations);
  const result = compactRecord({
    limits:
      Object.keys(limits).length > 0
        ? compactRecord({
            cpu: limits.cpus ? String(limits.cpus) : undefined,
            memory: limits.memory ? String(limits.memory) : undefined
          })
        : undefined,
    requests:
      Object.keys(reservations).length > 0
        ? compactRecord({
            cpu: reservations.cpus ? String(reservations.cpus) : undefined,
            memory: reservations.memory
              ? String(reservations.memory)
              : undefined
          })
        : undefined
  });

  return Object.keys(result).length > 0 ? result : undefined;
};

const toSecurityContext = (
  service: UnknownRecord
): UnknownRecord | undefined => {
  const capAdd = toStringArray(service.cap_add);
  const capDrop = toStringArray(service.cap_drop);
  const userId = String(service.user ?? "")
    .split(":")[0]
    .trim();
  const numericUser = userId ? Number(userId) : Number.NaN;
  const context = compactRecord({
    privileged: service.privileged === true ? true : undefined,
    readOnlyRootFilesystem: service.read_only === true ? true : undefined,
    runAsUser: Number.isInteger(numericUser) ? numericUser : undefined,
    capabilities:
      capAdd.length > 0 || capDrop.length > 0
        ? compactRecord({
            add: capAdd.length > 0 ? capAdd : undefined,
            drop: capDrop.length > 0 ? capDrop : undefined
          })
        : undefined
  });

  return Object.keys(context).length > 0 ? context : undefined;
};

const isBindSource = (source: string): boolean =>
  source.startsWith("/") ||
  source.startsWith(".") ||
  source.startsWith("~") ||
  /^[a-zA-Z]:[\\/]/.test(source);

const hostPathFor = (source: string): string => {
  if (source.startsWith("/")) {
    return source;
  }

  const relativePath = source
    .replace(/^~\/?/, "home/")
    .replace(/^\.\/?/, "")
    .replace(/[^a-zA-Z0-9._/-]+/g, "-");
  return `/workspace/${relativePath || "bind-mount"}`;
};

interface VolumeConversion {
  mounts: UnknownRecord[];
  volumes: UnknownRecord[];
  claims: Set<string>;
}

const convertServiceVolumes = (service: UnknownRecord): VolumeConversion => {
  const mounts: UnknownRecord[] = [];
  const volumes: UnknownRecord[] = [];
  const claims = new Set<string>();

  if (!Array.isArray(service.volumes)) {
    return { mounts, volumes, claims };
  }

  service.volumes.forEach((value: unknown, index: number) => {
    let source = "";
    let target = "";
    let type = "";
    let readOnly = false;

    if (typeof value === "string") {
      const segments = value.split(":");
      if (segments.length === 1) {
        target = segments[0];
      } else {
        source = segments[0];
        target = segments[1];
        readOnly = segments.slice(2).includes("ro");
      }
    } else if (isRecord(value)) {
      source = String(value.source ?? "");
      target = String(value.target ?? "");
      type = String(value.type ?? "");
      readOnly = value.read_only === true;
    }

    if (!target) {
      return;
    }

    const volumeName = kubernetesName(
      source || target.replace(/^\/+/, "") || `volume-${index}`,
      `volume-${index}`
    );
    mounts.push(
      compactRecord({
        name: volumeName,
        mountPath: target,
        readOnly: readOnly || undefined
      })
    );

    if (source && type !== "tmpfs" && !isBindSource(source)) {
      const claimName = kubernetesName(source, `claim-${index}`);
      claims.add(claimName);
      volumes.push({
        name: volumeName,
        persistentVolumeClaim: { claimName }
      });
      return;
    }

    if (source && (type === "bind" || isBindSource(source))) {
      volumes.push({
        name: volumeName,
        hostPath: { path: hostPathFor(source), type: "DirectoryOrCreate" }
      });
      return;
    }

    volumes.push({ name: volumeName, emptyDir: {} });
  });

  return { mounts, volumes, claims };
};

const persistentVolumeClaim = (name: string): UnknownRecord => ({
  apiVersion: "v1",
  kind: "PersistentVolumeClaim",
  metadata: {
    name,
    labels: { "app.kubernetes.io/managed-by": "container-toolkit" }
  },
  spec: {
    accessModes: ["ReadWriteOnce"],
    resources: { requests: { storage: "1Gi" } }
  }
});

const deploymentForService = (
  serviceName: string,
  serviceValue: unknown
): {
  deployment: UnknownRecord;
  service?: UnknownRecord;
  claims: Set<string>;
} => {
  const service = asRecord(serviceValue);
  const name = kubernetesName(serviceName);
  const appLabels = {
    "app.kubernetes.io/name": name,
    "app.kubernetes.io/managed-by": "container-toolkit"
  };
  const metadataLabels = { ...appLabels, ...toLabels(service.labels) };
  const ports = getPorts(service);
  const convertedVolumes = convertServiceVolumes(service);
  const deploy = asRecord(service.deploy);
  const entrypoint = splitCommand(service.entrypoint);
  const composeCommand = splitCommand(service.command);
  const container = compactRecord({
    name,
    image:
      typeof service.image === "string" && service.image.trim()
        ? service.image
        : `${name}:latest`,
    imagePullPolicy: imagePullPolicy(service.pull_policy),
    command:
      entrypoint ??
      (typeof service.command === "string" ? composeCommand : undefined),
    args:
      entrypoint && composeCommand
        ? Array.isArray(service.command)
          ? composeCommand
          : [String(service.command)]
        : Array.isArray(service.command)
          ? composeCommand
          : undefined,
    workingDir:
      typeof service.working_dir === "string" && service.working_dir
        ? service.working_dir
        : undefined,
    env:
      toEnvironment(service.environment).length > 0
        ? toEnvironment(service.environment)
        : undefined,
    ports:
      ports.length > 0
        ? ports.map((port) => ({
            name: portName(port.target, port.protocol.toLowerCase(), 0),
            containerPort: port.target,
            protocol: port.protocol
          }))
        : undefined,
    volumeMounts:
      convertedVolumes.mounts.length > 0 ? convertedVolumes.mounts : undefined,
    resources: toResources(deploy.resources),
    securityContext: toSecurityContext(service),
    livenessProbe: toHealthProbe(service.healthcheck),
    stdin: service.stdin_open === true ? true : undefined,
    tty: service.tty === true ? true : undefined
  });
  const replicasValue = Number(deploy.replicas);
  const replicas =
    Number.isInteger(replicasValue) && replicasValue >= 0 ? replicasValue : 1;
  const templateSpec = compactRecord({
    containers: [container],
    volumes:
      convertedVolumes.volumes.length > 0
        ? convertedVolumes.volumes
        : undefined,
    hostNetwork: service.network_mode === "host" ? true : undefined,
    dnsConfig:
      toStringArray(service.dns).length > 0
        ? { nameservers: toStringArray(service.dns) }
        : undefined
  });
  const deployment: UnknownRecord = {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: { name, labels: metadataLabels },
    spec: {
      replicas,
      selector: { matchLabels: appLabels },
      template: {
        metadata: { labels: metadataLabels },
        spec: templateSpec
      }
    }
  };

  if (ports.length === 0) {
    return { deployment, claims: convertedVolumes.claims };
  }

  const kubernetesService: UnknownRecord = {
    apiVersion: "v1",
    kind: "Service",
    metadata: { name, labels: metadataLabels },
    spec: {
      selector: appLabels,
      ports: ports.map((port, index) => ({
        name: portName(port.target, port.protocol.toLowerCase(), index),
        port: port.published,
        targetPort: port.target,
        protocol: port.protocol
      }))
    }
  };

  return {
    deployment,
    service: kubernetesService,
    claims: convertedVolumes.claims
  };
};

export const generateKubernetes = (data: ComposeData): string => {
  const documents: UnknownRecord[] = [];
  const declaredClaims = new Set<string>();
  const externalClaims = new Set<string>();

  Object.entries(data.volumes).forEach(([volumeName, volumeValue]) => {
    const config = asRecord(volumeValue);
    const claimName = kubernetesName(
      typeof config.name === "string" && config.name ? config.name : volumeName
    );

    if (config.external === true) {
      externalClaims.add(claimName);
      return;
    }

    declaredClaims.add(claimName);
  });

  const convertedServices = Object.entries(data.services).map(
    ([serviceName, service]) => deploymentForService(serviceName, service)
  );

  convertedServices.forEach(({ claims }) => {
    claims.forEach((claim) => {
      if (!externalClaims.has(claim)) {
        declaredClaims.add(claim);
      }
    });
  });

  [...declaredClaims]
    .sort()
    .forEach((claim) => documents.push(persistentVolumeClaim(claim)));

  convertedServices.forEach(({ deployment, service }) => {
    documents.push(deployment);
    if (service) {
      documents.push(service);
    }
  });

  if (documents.length === 0) {
    return "# Add a service to generate Kubernetes manifests.\n";
  }

  return documents.map(stringifyYamlDocument).join("\n");
};

export const generateManifest = (
  payload: IGeneratePayload,
  manifest: ManifestType
): GenerateResult => {
  try {
    if (manifest === manifestTypes.KUBERNETES) {
      return { code: generateKubernetes(payload.data) };
    }

    return { code: generateDockerCompose(payload.data) };
  } catch (error) {
    return {
      code: "",
      error:
        error instanceof Error ? error.message : "Unable to generate manifest"
    };
  }
};
