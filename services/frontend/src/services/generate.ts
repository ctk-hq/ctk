import YAML from "yaml";
import type { KubernetesServiceConfig } from "../types/service-exposure";
import {
  containerPorts as getContainerPorts,
  servicePorts
} from "../utils/service-ports";

import { manifestTypes } from "../constants";
import { IGeneratePayload, KubernetesStorage } from "../types";
import { kubernetesCommands } from "../utils/commands";
import { referencedVariables } from "../utils/variables";
import { composeDollars, updateImportedKubernetes } from "../utils/kubernetes";
import {
  cpuQuantity,
  memoryBytes,
  mountParts,
  kubernetesIdentity as kubernetesName
} from "../utils/container-values";
import {
  conversionDiagnostics,
  nativeComposeDiagnostics,
  diagnostic,
  pointer,
  validateCompose,
  validateKubernetes,
  type ManifestDiagnostic
} from "./manifest-validation";

type ManifestType = (typeof manifestTypes)[keyof typeof manifestTypes];
type ComposeData = IGeneratePayload["data"];
type UnknownRecord = Record<string, any>;

export interface GenerateResult {
  code: string;
  error?: string;
  rawCode?: string;
  diagnostics: ManifestDiagnostic[];
  blocked: boolean;
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

export const generateDockerCompose = (
  data: ComposeData,
  extra: Record<string, unknown> = {}
): string => {
  const document: UnknownRecord = { ...extra, services: data.services };

  if (Object.keys(data.networks).length > 0) {
    document.networks = data.networks;
  }

  if (Object.keys(data.volumes).length > 0) {
    document.volumes = data.volumes;
  }

  return stringifyYamlDocument(document);
};

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
            cpu: cpuQuantity(limits.cpus),
            memory: memoryBytes(limits.memory)
          })
        : undefined,
    requests:
      Object.keys(reservations).length > 0
        ? compactRecord({
            cpu: cpuQuantity(reservations.cpus),
            memory: memoryBytes(reservations.memory)
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
    runAsGroup: /^\d+:\d+$/.test(String(service.user ?? ""))
      ? Number(String(service.user).split(":")[1])
      : undefined,
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

  throw new Error(
    "A bind mount requires an absolute Kubernetes node path. Configure the path in native Kubernetes source."
  );
};

interface VolumeConversion {
  mounts: UnknownRecord[];
  volumes: UnknownRecord[];
  claims: Set<string>;
}

const convertServiceVolumes = (
  service: UnknownRecord,
  definitions: ComposeData["volumes"] = {}
): VolumeConversion => {
  const mounts: UnknownRecord[] = [];
  const volumes: UnknownRecord[] = [];
  const claims = new Set<string>();
  const volumeNamesBySource = new Map<string, string>();
  const usedVolumeNames = new Set<string>();

  if (!Array.isArray(service.volumes)) {
    return { mounts, volumes, claims };
  }

  service.volumes.forEach((value: unknown, index: number) => {
    let source = "";
    let target = "";
    let type = "";
    let readOnly = false;

    if (typeof value === "string") {
      const mount = mountParts(value);
      source = mount.name;
      target = mount.containerPath;
      readOnly = mount.accessMode.split(",").includes("ro");
    } else if (isRecord(value)) {
      source = String(value.source ?? "");
      target = String(value.target ?? "");
      type = String(value.type ?? "");
      readOnly = value.read_only === true;
    }

    if (!target) {
      return;
    }

    let sourceKey: string;
    let volumeSource: UnknownRecord;
    if (
      source &&
      type !== "tmpfs" &&
      (type === "bind" || isBindSource(source))
    ) {
      sourceKey = JSON.stringify(["bind", source]);
      volumeSource = {
        hostPath: { path: hostPathFor(source) }
      };
    } else if (source && type !== "tmpfs") {
      const physicalName = definitions[source]?.name;
      const claimName =
        typeof physicalName === "string" && physicalName
          ? physicalName
          : kubernetesName(source, `claim-${index}`);
      claims.add(claimName);
      sourceKey = JSON.stringify(["volume", source]);
      volumeSource = { persistentVolumeClaim: { claimName } };
    } else {
      // Each anonymous mount gets its own storage, even when names collide.
      sourceKey = JSON.stringify(["anonymous", index]);
      volumeSource = {
        emptyDir:
          type === "tmpfs"
            ? compactRecord({
                medium: "Memory",
                sizeLimit: isRecord(value)
                  ? memoryBytes(value.tmpfs?.size)
                  : undefined
              })
            : {}
      };
    }

    let volumeName = volumeNamesBySource.get(sourceKey);
    if (!volumeName) {
      const baseName = kubernetesName(
        source || target.replace(/^\/+/, "") || `volume-${index}`,
        `volume-${index}`
      );
      volumeName = baseName;
      let suffix = 1;
      while (usedVolumeNames.has(volumeName)) {
        const ending = `-${suffix++}`;
        const prefix = baseName
          .slice(0, 63 - ending.length)
          .replace(/[^a-z0-9]+$/g, "");
        volumeName = `${prefix}${ending}`;
      }
      volumeNamesBySource.set(sourceKey, volumeName);
      usedVolumeNames.add(volumeName);
      volumes.push({ name: volumeName, ...volumeSource });
    }

    mounts.push(
      compactRecord({
        name: volumeName,
        mountPath: target,
        readOnly: readOnly || undefined
      })
    );
  });

  return { mounts, volumes, claims };
};

const persistentVolumeClaim = (
  name: string,
  settings: KubernetesStorage
): UnknownRecord => ({
  apiVersion: "v1",
  kind: "PersistentVolumeClaim",
  metadata: {
    name,
    labels: { "app.kubernetes.io/managed-by": "container-toolkit" }
  },
  spec: {
    accessModes: [settings.accessMode],
    ...(settings.storageClass !== undefined
      ? { storageClassName: settings.storageClass }
      : {}),
    resources: { requests: { storage: settings.size } }
  }
});

const deploymentForService = (
  serviceName: string,
  serviceValue: unknown,
  volumes: ComposeData["volumes"] = {},
  exposure?: KubernetesServiceConfig
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
  const metadataLabels = { ...toLabels(service.labels), ...appLabels };
  const ports = servicePorts(service, exposure);
  const containerPorts = getContainerPorts(service, exposure);
  const convertedVolumes = convertServiceVolumes(service, volumes);
  const deploy = asRecord(service.deploy);
  let commands: ReturnType<typeof kubernetesCommands>;
  try {
    commands = kubernetesCommands(service.command, service.entrypoint);
  } catch (error) {
    throw new Error(`Service "${serviceName}": ${(error as Error).message}`, {
      cause: error
    });
  }
  const container = compactRecord({
    name,
    image:
      typeof service.image === "string" && service.image.trim()
        ? service.image
        : undefined,
    imagePullPolicy: imagePullPolicy(service.pull_policy),
    ...commands,
    workingDir:
      typeof service.working_dir === "string" && service.working_dir
        ? service.working_dir
        : undefined,
    env:
      toEnvironment(service.environment).length > 0
        ? toEnvironment(service.environment)
        : undefined,
    ports: containerPorts.length > 0 ? containerPorts : undefined,
    volumeMounts:
      convertedVolumes.mounts.length > 0 ? convertedVolumes.mounts : undefined,
    resources: toResources(deploy.resources),
    securityContext: toSecurityContext(service),
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
    dnsPolicy:
      service.network_mode === "host" ? "ClusterFirstWithHostNet" : undefined,
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
      ...(exposure ? { type: exposure.type } : {}),
      selector: appLabels,
      ports
    }
  };

  return {
    deployment,
    service: kubernetesService,
    claims: convertedVolumes.claims
  };
};

const renderKubernetes = (
  input: ComposeData,
  storage: IGeneratePayload["kubernetesStorage"] = {},
  exposures: IGeneratePayload["kubernetesServices"] = {}
): string => {
  const data = composeDollars(input, "unescape");
  if (referencedVariables(input).length) {
    throw new Error(
      "Kubernetes export cannot resolve Compose variables. Use concrete non-secret configuration or native Secret/ConfigMap references before exporting."
    );
  }
  const documents: UnknownRecord[] = [];
  const declaredClaims = new Set<string>();
  const externalClaims = new Set<string>();

  Object.entries(data.volumes).forEach(([volumeName, volumeValue]) => {
    const config = asRecord(volumeValue);
    const claimName =
      typeof config.name === "string" && config.name
        ? config.name
        : kubernetesName(volumeName);

    if (config.external === true) {
      externalClaims.add(claimName);
      return;
    }

    declaredClaims.add(claimName);
  });

  const convertedServices = Object.entries(data.services).map(
    ([serviceName, service]) =>
      deploymentForService(
        serviceName,
        service,
        data.volumes,
        exposures[serviceName]
      )
  );

  convertedServices.forEach(({ claims }) => {
    claims.forEach((claim) => {
      if (!externalClaims.has(claim)) {
        declaredClaims.add(claim);
      }
    });
  });

  [...declaredClaims].sort().forEach((claim) => {
    const logical = Object.keys(data.volumes).find(
      (key) => (data.volumes[key].name || kubernetesName(key)) === claim
    );
    const settings = logical ? storage[logical] : undefined;
    if (!settings?.size || !settings.accessMode)
      throw new Error(
        `Volume "${logical ?? claim}": choose Kubernetes storage size and access mode in the volume form before exporting.`
      );
    documents.push(persistentVolumeClaim(claim, settings));
  });

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

export const generateKubernetes = (
  input: ComposeData,
  storage?: IGeneratePayload["kubernetesStorage"]
): string => {
  const result = generateManifest(
    { data: input, kubernetesStorage: storage },
    manifestTypes.KUBERNETES
  );
  if (result.error) throw new Error(result.error);
  return result.code;
};

export const generateManifest = (
  payload: IGeneratePayload,
  manifest: ManifestType
): GenerateResult => {
  const diagnostics: ManifestDiagnostic[] = (payload.graphErrors ?? []).map(
    (reason) =>
      diagnostic(
        "GRAPH_INVALID",
        "/",
        manifest,
        reason,
        "Choose unique graph names and repair connections."
      )
  );
  let code = "";
  try {
    const compose = YAML.parse(
      generateDockerCompose(payload.data, payload.manifestSource?.compose)
    );
    diagnostics.push(
      ...validateCompose(compose).map((item) => ({ ...item, target: manifest }))
    );
    if (manifest === manifestTypes.KUBERNETES) {
      diagnostics.push(...conversionDiagnostics(payload));
      const claimIntents = new Map<
        string,
        { external: boolean; settings: unknown }
      >();
      for (const [logical, config] of Object.entries(payload.data.volumes)) {
        const name = config.name || kubernetesName(logical);
        const intent = {
          external: config.external === true,
          settings: payload.kubernetesStorage?.[logical]
        };
        const previous = claimIntents.get(name);
        if (previous && JSON.stringify(previous) !== JSON.stringify(intent))
          diagnostics.push(
            diagnostic(
              "CLAIM_IDENTITY_CONFLICT",
              `/volumes/${pointer(logical)}`,
              manifest,
              "Two volume definitions resolve to the same claim with conflicting ownership or storage requirements.",
              "Use distinct physical claim names or matching storage definitions."
            )
          );
        claimIntents.set(name, intent);
        if (
          !config.external &&
          (!payload.kubernetesStorage?.[logical]?.size ||
            !payload.kubernetesStorage?.[logical]?.accessMode)
        )
          diagnostics.push(
            diagnostic(
              "STORAGE_CONFIG_REQUIRED",
              `/volumes/${pointer(logical)}`,
              manifest,
              "A new claim needs an explicit storage size and access mode.",
              "Open this volume's form and choose Kubernetes storage settings."
            )
          );
      }
      for (const [name, service] of Object.entries(payload.data.services)) {
        const labels = toLabels(service.labels);
        const identity = kubernetesName(name);
        for (const [key, value] of Object.entries({
          "app.kubernetes.io/name": identity,
          "app.kubernetes.io/managed-by": "container-toolkit"
        })) {
          if (labels[key] !== undefined && labels[key] !== value)
            diagnostics.push(
              diagnostic(
                "SELECTOR_LABEL_RESERVED",
                `/services/${pointer(name)}/labels/${pointer(key)}`,
                manifest,
                "This label conflicts with a generated identity label.",
                "Remove the reserved label override."
              )
            );
        }
        if (identity !== name)
          diagnostics.push(
            diagnostic(
              "NAME_NORMALIZED",
              `/services/${pointer(name)}`,
              manifest,
              `The Kubernetes identity is ${identity}.`,
              "Use this generated identity when referring to the workload.",
              "info"
            )
          );
      }
      if (payload.manifestSource?.kubernetes) {
        const { documents, remaining } = updateImportedKubernetes(
          payload,
          (name, service) =>
            deploymentForService(
              name,
              composeDollars(service, "unescape"),
              payload.data.volumes
            )
        );
        if (Object.keys(remaining.services).length) {
          const generated = YAML.parseAllDocuments(
            renderKubernetes(
              remaining,
              payload.kubernetesStorage,
              payload.kubernetesServices
            )
          ).map((document) => document.toJSON());
          for (const resource of generated) {
            const existing = documents.find(
              (document) =>
                document.kind === resource.kind &&
                document.metadata.name === resource.metadata.name &&
                (document.metadata.namespace || "default") ===
                  (resource.metadata.namespace || "default")
            );
            if (existing?.kind === "PersistentVolumeClaim") continue;
            if (existing)
              throw new Error(
                `A generated ${resource.kind}/${resource.metadata.name} conflicts with an imported resource. Choose a different service name.`
              );
            documents.push(resource);
          }
        }
        diagnostics.push(...validateKubernetes(documents));
        code = documents.map(stringifyYamlDocument).join("\n");
      } else {
        code = renderKubernetes(
          payload.data,
          payload.kubernetesStorage,
          payload.kubernetesServices
        );
        if (!code.startsWith("#"))
          diagnostics.push(
            ...validateKubernetes(
              YAML.parseAllDocuments(code).map((document) => document.toJSON())
            )
          );
      }
    } else {
      diagnostics.push(...nativeComposeDiagnostics(payload));
      code = generateDockerCompose(
        payload.data,
        payload.manifestSource?.compose
      );
    }
  } catch (error) {
    diagnostics.push(
      diagnostic(
        "GENERATION_FAILED",
        "/",
        manifest,
        error instanceof Error ? error.message : "Unable to generate manifest.",
        "Correct the reported configuration before exporting."
      )
    );
  }
  const blocked = diagnostics.some((item) => item.blocksExport);
  return {
    code: blocked ? "" : code,
    rawCode: code,
    diagnostics,
    blocked,
    ...(blocked
      ? {
          error: [
            ...new Set(
              diagnostics
                .filter((item) => item.blocksExport)
                .map(
                  (item) => `${item.sourcePath}: ${item.reason} ${item.action}`
                )
            )
          ].join("\n")
        }
      : {})
  };
};
