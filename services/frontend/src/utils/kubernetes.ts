import { manifestTypes } from "../constants";
import type { IGeneratePayload, KubernetesBinding } from "../types";
import type { ManifestImport } from "./manifests";

type RecordValue = Record<string, any>;
const record = (value: unknown): RecordValue =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
const list = (value: unknown): any[] => (Array.isArray(value) ? value : []);
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export function composeDollars<T>(
  value: T,
  direction: "escape" | "unescape"
): T {
  if (typeof value === "string")
    return (
      direction === "escape"
        ? value.replaceAll("$", () => "$$")
        : value.replaceAll("$$", "$")
    ) as T;
  if (Array.isArray(value))
    return value.map((entry) => composeDollars(entry, direction)) as T;
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        composeDollars(entry, direction)
      ])
    ) as T;
  return value;
}

function podTemplate(resource: RecordValue): RecordValue | undefined {
  const spec = record(resource.spec);
  if (resource.apiVersion === "v1" && resource.kind === "Pod") return resource;
  if (
    (resource.apiVersion === "apps/v1" &&
      ["Deployment", "StatefulSet", "DaemonSet", "ReplicaSet"].includes(
        resource.kind
      )) ||
    (resource.apiVersion === "batch/v1" && resource.kind === "Job") ||
    (resource.apiVersion === "v1" && resource.kind === "ReplicationController")
  )
    return spec.template;
  if (resource.apiVersion === "batch/v1" && resource.kind === "CronJob")
    return spec.jobTemplate?.spec?.template;
  return undefined;
}

function cpu(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  const text = String(value);
  if (/^\d+(?:\.\d+)?m$/.test(text))
    return String(Number(text.slice(0, -1)) / 1000);
  return /^\d+(?:\.\d+)?$/.test(text) ? text : undefined;
}

function memory(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  const match = String(value).match(/^(\d+(?:\.\d+)?)([EPTGMK]i?|k)?$/);
  if (!match) return undefined;
  const exponent = "KMGTPE".indexOf((match[2] || "").toUpperCase()[0]) + 1;
  const bytes =
    Number(match[1]) * (match[2]?.endsWith("i") ? 1024 : 1000) ** exponent;
  return Number.isSafeInteger(bytes) ? String(bytes) : undefined;
}

function resources(value: unknown): RecordValue | undefined {
  const result: RecordValue = {};
  for (const [native, compose] of [
    ["limits", "limits"],
    ["requests", "reservations"]
  ]) {
    const source = record(record(value)[native]);
    const mapped = Object.fromEntries(
      Object.entries({
        cpus: cpu(source.cpu),
        memory: memory(source.memory)
      }).filter(([, value]) => value !== undefined)
    );
    if (Object.keys(mapped).length) result[compose] = mapped;
  }
  return Object.keys(result).length ? result : undefined;
}

export function importKubernetes(input: RecordValue[]): ManifestImport {
  const documents: RecordValue[] = [];
  const expand = (resource: RecordValue) => {
    if (resource.apiVersion === "v1" && resource.kind === "List") {
      if (!Array.isArray(resource.items))
        throw new Error("Kubernetes List needs an items array.");
      resource.items.forEach((item: unknown) => expand(record(item)));
    } else documents.push(resource);
  };
  input.forEach(expand);
  const identities = new Set<string>();
  for (const resource of documents) {
    if (
      typeof resource.apiVersion !== "string" ||
      typeof resource.kind !== "string" ||
      typeof resource.metadata?.name !== "string" ||
      !resource.metadata.name
    ) {
      throw new Error(
        "Every Kubernetes resource needs apiVersion, kind, and metadata.name."
      );
    }
    const identity = JSON.stringify([
      resource.apiVersion.split("/")[0],
      resource.kind,
      resource.metadata.namespace || "default",
      resource.metadata.name
    ]);
    if (identities.has(identity))
      throw new Error(
        `Duplicate Kubernetes resource: ${resource.kind}/${resource.metadata.name}.`
      );
    identities.add(identity);
  }
  if (!documents.length)
    throw new Error("The Kubernetes resource list is empty.");
  const data: IGeneratePayload["data"] = {
    services: Object.create(null),
    volumes: Object.create(null),
    networks: {}
  };
  const bindings: KubernetesBinding[] = [];
  const warnings = new Set<string>();
  warnings.add(
    "Kubernetes resources and settings are preserved in Kubernetes. Compose contains the mapped container settings; review it before running."
  );
  const uniqueName = (requested: string, used: RecordValue) => {
    const name = requested.replace(/[^a-zA-Z0-9_.-]/g, "-") || "app";
    let candidate = name;
    let suffix = 2;
    while (Object.hasOwn(used, candidate)) candidate = `${name}-${suffix++}`;
    return candidate;
  };
  const claims = new Map<string, string>();
  const claimName = (name: string, namespace: string) => {
    const identity = `${namespace}/${name}`;
    if (!claims.has(identity)) {
      const logical = uniqueName(name, data.volumes);
      claims.set(identity, logical);
      data.volumes[logical] = { name, external: true };
    }
    return claims.get(identity)!;
  };
  documents.forEach((resource) => {
    if (
      resource.apiVersion === "v1" &&
      resource.kind === "PersistentVolumeClaim"
    ) {
      claimName(
        resource.metadata.name,
        resource.metadata.namespace || "default"
      );
      warnings.add(
        "PersistentVolumeClaims become external Compose volumes. Provision their data separately; Kubernetes storage settings stay in Kubernetes."
      );
    }
  });
  documents.forEach((resource, documentIndex) => {
    const template = podTemplate(resource);
    if (!template) {
      if (!["Service", "PersistentVolumeClaim"].includes(resource.kind))
        warnings.add(
          `${resource.kind}/${resource.metadata.name} is preserved in Kubernetes and has no graph node or Compose translation.`
        );
      return;
    }
    const pod = record(template.spec);
    const containers = list(pod.containers);
    if (!containers.length)
      throw new Error(
        `${resource.kind}/${resource.metadata.name} needs at least one container.`
      );
    if (containers.length > 1)
      warnings.add(
        `${resource.metadata.name} has multiple containers. Compose creates separate services without Kubernetes Pod sharing.`
      );
    if (resource.kind !== "Deployment" && resource.kind !== "Pod")
      warnings.add(
        `${resource.kind} lifecycle and scheduling stay in Kubernetes; Compose services do not reproduce them.`
      );
    if (list(pod.initContainers).length)
      warnings.add(
        "Init containers are preserved in Kubernetes and are not translated to Compose services."
      );
    containers.forEach((raw, containerIndex) => {
      const container = record(raw);
      if (
        typeof container.name !== "string" ||
        typeof container.image !== "string" ||
        !container.image.trim()
      )
        throw new Error(
          `${resource.metadata.name}: each container needs a name and image.`
        );
      const name = uniqueName(
        containers.length === 1
          ? resource.metadata.name
          : `${resource.metadata.name}-${container.name}`,
        data.services
      );
      const config: RecordValue = { image: container.image };
      for (const [native, compose] of [
        ["command", "entrypoint"],
        ["args", "command"],
        ["workingDir", "working_dir"],
        ["stdin", "stdin_open"],
        ["tty", "tty"]
      ]) {
        if (container[native] !== undefined)
          config[compose] = clone(container[native]);
      }
      const environment = Object.fromEntries(
        list(container.env)
          .filter(
            (entry) =>
              typeof entry.name === "string" && entry.value !== undefined
          )
          .map((entry) => [entry.name, String(entry.value)])
      );
      if (Object.keys(environment).length) config.environment = environment;
      if (
        list(container.env).some((entry) => entry.valueFrom) ||
        list(container.envFrom).length
      )
        warnings.add(
          "Environment references to Secrets, ConfigMaps, or Pod fields stay in Kubernetes; supply those values separately for Compose."
        );
      const ports = list(container.ports).filter(
        (port) =>
          Number.isInteger(port.containerPort) &&
          port.containerPort > 0 &&
          port.containerPort <= 65535
      );
      if (ports.length)
        config.expose = ports.map(
          (port) =>
            `${port.containerPort}${port.protocol && port.protocol !== "TCP" ? `/${String(port.protocol).toLowerCase()}` : ""}`
        );
      const security = record(container.securityContext);
      if (security.runAsUser !== undefined)
        config.user = String(security.runAsUser);
      if (security.privileged !== undefined)
        config.privileged = security.privileged;
      if (security.readOnlyRootFilesystem !== undefined)
        config.read_only = security.readOnlyRootFilesystem;
      if (security.capabilities?.add)
        config.cap_add = clone(security.capabilities.add);
      if (security.capabilities?.drop)
        config.cap_drop = clone(security.capabilities.drop);
      const limits = resources(container.resources);
      if (limits) config.deploy = { resources: limits };
      if (resource.spec?.replicas !== undefined)
        config.deploy = { ...config.deploy, replicas: resource.spec.replicas };
      if (pod.hostNetwork === true) config.network_mode = "host";
      if (list(pod.dnsConfig?.nameservers).length)
        config.dns = clone(pod.dnsConfig.nameservers);
      const volumes: RecordValue[] = [];
      for (const mount of list(container.volumeMounts)) {
        const volume = list(pod.volumes).find(
          (volume) => volume.name === mount.name
        );
        if (
          !volume ||
          mount.subPath ||
          mount.subPathExpr ||
          mount.mountPropagation
        ) {
          warnings.add(
            "Some volume mounts have Kubernetes-only settings and stay in Kubernetes."
          );
          continue;
        }
        const target = mount.mountPath;
        const read_only = mount.readOnly === true;
        if (volume.persistentVolumeClaim?.claimName) {
          volumes.push({
            type: "volume",
            source: claimName(
              volume.persistentVolumeClaim.claimName,
              resource.metadata.namespace || "default"
            ),
            target,
            read_only:
              read_only || volume.persistentVolumeClaim.readOnly === true
          });
          warnings.add(
            "PersistentVolumeClaims become external Compose volumes. Provision their data separately; Kubernetes storage settings stay in Kubernetes."
          );
        } else if (volume.hostPath?.path)
          volumes.push({
            type: "bind",
            source: volume.hostPath.path,
            target,
            read_only
          });
        else if (volume.emptyDir && volume.emptyDir.medium === "Memory") {
          volumes.push({ type: "tmpfs", target, read_only });
          warnings.add(
            "emptyDir memory limits and Pod lifetime stay in Kubernetes; Compose tmpfs has a container lifetime."
          );
        } else if (volume.emptyDir) {
          volumes.push({ type: "volume", target, read_only });
          warnings.add(
            "Disk-backed emptyDir becomes an anonymous Compose volume with a different lifetime."
          );
        } else
          warnings.add(
            "ConfigMap, Secret, projected, and driver-specific volume mounts stay in Kubernetes; configure their Compose equivalents separately."
          );
      }
      if (volumes.length) config.volumes = volumes;
      const composeConfig = composeDollars(config, "escape");
      data.services[name] = composeConfig;
      bindings.push({
        serviceName: name,
        documentIndex,
        containerIndex,
        config: clone(composeConfig)
      });
    });
  });
  if (documents.some((resource) => resource.kind === "Service"))
    warnings.add(
      "Kubernetes Services and routing stay in Kubernetes. Compose exposes container ports without publishing them to the host."
    );
  return {
    type: manifestTypes.KUBERNETES,
    data,
    source: { kubernetes: { documents, bindings }, warnings: [...warnings] }
  };
}

type Projection = (
  name: string,
  config: RecordValue
) => { deployment: RecordValue };

/** Patch only shared settings that changed; preserve opaque native fields verbatim. */
export function updateImportedKubernetes(
  payload: IGeneratePayload,
  project: Projection
): { documents: RecordValue[]; remaining: IGeneratePayload["data"] } {
  const source = payload.manifestSource!.kubernetes!;
  const importedVolumes = importKubernetes(source.documents).data.volumes;
  for (const [name, definition] of Object.entries(importedVolumes)) {
    if (!equal(definition, payload.data.volumes[name]))
      throw new Error(
        `${name}: edit imported Kubernetes storage in the Kubernetes manifest. Its claim and namespace cannot be changed through the Compose volume form.`
      );
  }
  const documents = clone(source.documents);
  const remaining = {
    ...payload.data,
    services: { ...payload.data.services },
    volumes: {}
  };
  const removed = new Set<number>();
  const getName = (binding: KubernetesBinding) =>
    binding.nodeKey && payload.nodeNames
      ? payload.nodeNames[binding.nodeKey]
      : binding.serviceName;
  for (const binding of source.bindings) {
    const name = getName(binding);
    const current: RecordValue | undefined = name
      ? payload.data.services[name]
      : undefined;
    const resource = documents[binding.documentIndex];
    const pod = podTemplate(resource)!.spec;
    if (!current) continue;
    delete remaining.services[name];
    const before = binding.config as RecordValue;
    if (equal(before, current)) continue;
    const container = pod.containers[binding.containerIndex];
    const projected = project(name, current).deployment.spec.template.spec;
    const native = projected.containers[0];
    const replace = (object: RecordValue, field: string, value: unknown) => {
      if (value === undefined) delete object[field];
      else object[field] = clone(value);
    };
    for (const [compose, field] of [
      ["image", "image"],
      ["working_dir", "workingDir"],
      ["stdin_open", "stdin"],
      ["tty", "tty"]
    ]) {
      if (!equal(before[compose], current[compose]))
        replace(container, field, native[field]);
    }
    if (
      !equal(
        [before.command, before.entrypoint],
        [current.command, current.entrypoint]
      )
    ) {
      replace(container, "command", native.command);
      replace(container, "args", native.args);
    }
    if (!equal(before.environment, current.environment)) {
      const literal = list(native.env);
      const names = new Set(literal.map((entry) => entry.name));
      container.env = [
        ...list(container.env).filter(
          (entry) => entry.valueFrom && !names.has(entry.name)
        ),
        ...literal
      ];
    }
    if (
      !equal([before.ports, before.expose], [current.ports, current.expose])
    ) {
      if (!equal(before.ports, current.ports) && list(current.ports).length)
        throw new Error(
          `${name}: edit published ports in the Kubernetes Service manifest. Compose host ports are not applied to imported Services.`
        );
      const previousPorts = list(container.ports);
      const nextPorts = list(native.ports).map((port, index) => {
        const previous =
          previousPorts.find(
            (original) =>
              original.containerPort === port.containerPort &&
              (original.protocol || "TCP") === port.protocol
          ) ?? previousPorts[index];
        return previous
          ? {
              ...previous,
              containerPort: port.containerPort,
              protocol: port.protocol
            }
          : port;
      });
      const removedNames = previousPorts
        .filter(
          (port) =>
            port.name && !nextPorts.some((next) => next.name === port.name)
        )
        .map((port) => port.name);
      const selectedServices = source.documents.filter(
        (document) =>
          document.kind === "Service" &&
          (document.metadata.namespace || "default") ===
            (resource.metadata.namespace || "default") &&
          Object.keys(record(document.spec?.selector)).length &&
          Object.entries(record(document.spec.selector)).every(
            ([key, value]) =>
              podTemplate(resource)?.metadata?.labels?.[key] === value
          )
      );
      const referenced =
        selectedServices.some((service) =>
          list(service.spec.ports).some((port) =>
            removedNames.includes(port.targetPort)
          )
        ) ||
        [
          container.livenessProbe,
          container.readinessProbe,
          container.startupProbe
        ].some((probe) =>
          removedNames.includes(probe?.httpGet?.port ?? probe?.tcpSocket?.port)
        );
      if (referenced)
        throw new Error(
          `${name}: a removed named port is still used by a Kubernetes Service or probe. Edit those references in the Kubernetes manifest first.`
        );
      replace(container, "ports", nextPorts);
    }
    for (const [compose, field] of [
      ["user", "runAsUser"],
      ["privileged", "privileged"],
      ["read_only", "readOnlyRootFilesystem"]
    ]) {
      if (!equal(before[compose], current[compose])) {
        container.securityContext ??= {};
        replace(
          container.securityContext,
          field,
          native.securityContext?.[field]
        );
      }
    }
    if (
      !equal(
        [before.cap_add, before.cap_drop],
        [current.cap_add, current.cap_drop]
      )
    ) {
      container.securityContext ??= {};
      replace(
        container.securityContext,
        "capabilities",
        native.securityContext?.capabilities
      );
    }
    if (!equal(before.deploy?.resources, current.deploy?.resources)) {
      container.resources ??= {};
      for (const field of ["limits", "requests"]) {
        const values = { ...container.resources[field] };
        delete values.cpu;
        delete values.memory;
        Object.assign(values, native.resources?.[field]);
        replace(
          container.resources,
          field,
          Object.keys(values).length ? values : undefined
        );
      }
    }
    const deployBefore = { ...before.deploy };
    const deployCurrent = { ...current.deploy };
    delete deployBefore.replicas;
    delete deployBefore.resources;
    delete deployCurrent.replicas;
    delete deployCurrent.resources;
    if (!equal(deployBefore, deployCurrent))
      throw new Error(
        `${name}: Compose deployment policies cannot be applied to the imported Kubernetes workload. Edit its Kubernetes manifest instead.`
      );
    if (!equal(before.deploy?.replicas, current.deploy?.replicas)) {
      if (
        ![
          "Deployment",
          "StatefulSet",
          "ReplicaSet",
          "ReplicationController"
        ].includes(resource.kind)
      )
        throw new Error(
          `${resource.kind}/${resource.metadata.name} does not support replicas. Edit its Kubernetes manifest instead.`
        );
      const replicas =
        current.deploy?.replicas === undefined
          ? undefined
          : Number(current.deploy.replicas);
      if (
        replicas !== undefined &&
        (!Number.isInteger(replicas) || replicas < 0)
      )
        throw new Error(`${name}: replicas must be a non-negative integer.`);
      replace(resource.spec, "replicas", replicas);
    }
    if (!equal(before.network_mode, current.network_mode))
      replace(pod, "hostNetwork", projected.hostNetwork);
    if (!equal(before.dns, current.dns)) {
      pod.dnsConfig ??= {};
      replace(pod.dnsConfig, "nameservers", projected.dnsConfig?.nameservers);
    }
    if (!equal(before.volumes, current.volumes)) {
      const mappedPaths = new Set(
        list(composeDollars(before.volumes, "unescape")).map(
          (mount) => mount.target
        )
      );
      const preserved = list(container.volumeMounts).filter(
        (mount) => !mappedPaths.has(mount.mountPath)
      );
      const usedNames = new Set(list(pod.volumes).map((volume) => volume.name));
      const names = new Map<string, string>();
      const added = list(projected.volumes).map((volume) => {
        let name = `ctk-${binding.containerIndex}-${volume.name}`;
        while (usedNames.has(name)) name += "-new";
        usedNames.add(name);
        names.set(volume.name, name);
        return { ...volume, name };
      });
      container.volumeMounts = [
        ...preserved,
        ...list(native.volumeMounts).map((mount) => ({
          ...mount,
          name: names.get(mount.name)
        }))
      ];
      pod.volumes = [...list(pod.volumes), ...added];
    }
    const supported = new Set([
      "image",
      "entrypoint",
      "command",
      "working_dir",
      "stdin_open",
      "tty",
      "environment",
      "expose",
      "ports",
      "user",
      "privileged",
      "read_only",
      "cap_add",
      "cap_drop",
      "deploy",
      "network_mode",
      "dns",
      "volumes"
    ]);
    const changedUnsupported = [
      ...new Set([...Object.keys(before), ...Object.keys(current)])
    ].filter((key) => !supported.has(key) && !equal(before[key], current[key]));
    if (changedUnsupported.length)
      throw new Error(
        `${name}: ${changedUnsupported.join(", ")} cannot be applied to the imported Kubernetes workload. Edit its Kubernetes manifest instead.`
      );
  }
  const workloads = new Set(
    source.bindings.map((binding) => binding.documentIndex)
  );
  for (const index of workloads) {
    const pod = podTemplate(documents[index])!.spec;
    pod.containers = pod.containers.filter(
      (_: unknown, containerIndex: number) =>
        source.bindings.some(
          (binding) =>
            binding.documentIndex === index &&
            binding.containerIndex === containerIndex &&
            getName(binding) &&
            Object.hasOwn(payload.data.services, getName(binding))
        )
    );
    if (!pod.containers.length) removed.add(index);
  }
  return {
    documents: documents.filter((_, index) => !removed.has(index)),
    remaining
  };
}
