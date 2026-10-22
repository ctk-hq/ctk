import type { KubernetesBinding, ManifestSource } from "../types";
import type {
  KubernetesServiceConfig,
  ServiceNetworking
} from "../types/service-exposure";
import { servicePorts } from "./service-ports";

type Resource = Record<string, any>;
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

export function workloadTemplate(resource: Resource): Resource | undefined {
  if (resource.kind === "Pod") return resource;
  if (resource.kind === "CronJob")
    return resource.spec?.jobTemplate?.spec?.template;
  if (
    [
      "Deployment",
      "StatefulSet",
      "DaemonSet",
      "ReplicaSet",
      "ReplicationController",
      "Job"
    ].includes(resource.kind)
  )
    return resource.spec?.template;
  return undefined;
}

export function selectsWorkload(
  service: Resource,
  workload: Resource
): boolean {
  const selector = service.spec?.selector;
  const labels = workloadTemplate(workload)?.metadata?.labels ?? {};
  return (
    service.kind === "Service" &&
    (service.metadata?.namespace || "default") ===
      (workload.metadata?.namespace || "default") &&
    !!selector &&
    Object.keys(selector).length > 0 &&
    Object.entries(selector).every(([key, value]) => labels[key] === value)
  );
}

/** Only offer an editor when one Service belongs to one single-container workload. */
export function bindKubernetesServices(
  documents: Resource[],
  bindings: KubernetesBinding[]
) {
  for (const binding of bindings) {
    delete binding.service;
    delete binding.serviceNotice;
    const workload = documents[binding.documentIndex];
    const matching = documents
      .map((resource, index) => ({ resource, index }))
      .filter(({ resource }) => selectsWorkload(resource, workload));
    const ambiguous =
      (workloadTemplate(workload)?.spec?.containers?.length ?? 0) !== 1 ||
      matching.length > 1 ||
      matching.some(
        ({ resource }) =>
          documents.filter(
            (candidate) =>
              workloadTemplate(candidate) &&
              selectsWorkload(resource, candidate)
          ).length !== 1
      );
    const selected = matching[0];
    if (
      ambiguous ||
      (selected &&
        (![undefined, "ClusterIP", "NodePort", "LoadBalancer"].includes(
          selected.resource.spec.type
        ) ||
          selected.resource.spec.clusterIP === "None"))
    ) {
      binding.serviceNotice =
        "This workload has shared, multiple or advanced Services. Edit their exposure in the Kubernetes manifest.";
      continue;
    }
    binding.service = selected
      ? {
          documentIndex: selected.index,
          config: {
            type: selected.resource.spec.type ?? "ClusterIP",
            ports: (selected.resource.spec.ports ?? []).map(
              (port: Resource) => ({
                ...(port.name !== undefined ? { name: port.name } : {}),
                port: port.port,
                targetPort: port.targetPort ?? port.port,
                protocol: port.protocol ?? "TCP",
                ...(port.nodePort ? { nodePort: port.nodePort } : {}),
                ...(port.appProtocol !== undefined
                  ? { appProtocol: port.appProtocol }
                  : {})
              })
            )
          }
        }
      : { config: { type: "None", ports: [] } };
  }
}

export function importedNetworking(
  binding: KubernetesBinding
): ServiceNetworking {
  return {
    native: true,
    ...(binding.service
      ? { service: structuredClone(binding.service.config) }
      : {}),
    ...(binding.serviceNotice ? { serviceNotice: binding.serviceNotice } : {})
  };
}

/** Upgrade older saved canvases without changing native resources or user edits. */
export function hydrateServiceNetworking<T extends Record<string, any>>(
  nodes: T,
  source?: ManifestSource
): T {
  if (!source?.kubernetes) return nodes;
  const bindings = structuredClone(source.kubernetes.bindings);
  bindKubernetesServices(source.kubernetes.documents, bindings);
  return Object.fromEntries(
    Object.entries(nodes).map(([key, node]) => {
      if (
        node.type !== "SERVICE" ||
        node.kubernetes?.service ||
        node.kubernetes?.serviceNotice
      )
        return [key, node];
      const binding = bindings.find(
        (binding) =>
          binding.nodeKey === key ||
          (!binding.nodeKey &&
            binding.serviceName === node.canvasConfig.node_name)
      );
      return [
        key,
        binding ? { ...node, kubernetes: importedNetworking(binding) } : node
      ];
    })
  ) as T;
}

/** Patch represented fields only; retain selectors, allocation and provider options. */
export function updateKubernetesService(
  documents: Resource[],
  binding: KubernetesBinding,
  settings: KubernetesServiceConfig | undefined
) {
  if (!settings || equal(settings, binding.service?.config)) return;
  if (!binding.service || binding.serviceNotice)
    throw new Error(
      `${binding.serviceName}: edit shared or advanced Services in the Kubernetes manifest.`
    );
  const index = binding.service.documentIndex;
  const original = index === undefined ? undefined : documents[index];
  if (settings.type === "None") {
    return !!original;
  }
  if (original) {
    const spec = original.spec;
    if (settings.type !== (spec.type ?? "ClusterIP")) {
      const incompatible = [
        ...(settings.type !== "LoadBalancer"
          ? [
              "loadBalancerClass",
              "loadBalancerIP",
              "loadBalancerSourceRanges",
              "allocateLoadBalancerNodePorts",
              "healthCheckNodePort"
            ]
          : []),
        ...(settings.type === "ClusterIP" ? ["externalTrafficPolicy"] : [])
      ].filter((key) => spec[key] !== undefined);
      if (incompatible.length)
        throw new Error(
          `${binding.serviceName}: changing Service type affects ${incompatible.join(", ")}. Update these options in the Kubernetes manifest first.`
        );
    }
    spec.type = settings.type;
    spec.ports = settings.ports.map((port) => {
      const old = (binding.service!.config.ports ?? []).findIndex(
        (entry) => entry.name && entry.name === port.name
      );
      // Names are the stable identity of Service ports; unnamed ports match by number/protocol.
      const position =
        old >= 0
          ? old
          : binding.service!.config.ports.findIndex(
              (entry) =>
                !entry.name &&
                entry.port === port.port &&
                entry.protocol === port.protocol
            );
      const result = {
        ...(position >= 0 ? spec.ports[position] : {}),
        ...port
      };
      for (const key of ["name", "appProtocol", "nodePort"] as const)
        if (port[key] === undefined) delete result[key];
      if (settings.type === "ClusterIP") delete result.nodePort;
      return result;
    });
    return;
  }
  const workload = documents[binding.documentIndex];
  const labels = workloadTemplate(workload)?.metadata?.labels;
  if (!labels || !Object.keys(labels).length)
    throw new Error(
      `${binding.serviceName}: add workload labels in the Kubernetes manifest before creating a Service.`
    );
  const name = workload.metadata.name;
  const selectorService = {
    kind: "Service",
    metadata: workload.metadata,
    spec: { selector: labels }
  };
  if (
    documents.filter(
      (candidate) =>
        workloadTemplate(candidate) &&
        selectsWorkload(selectorService, candidate)
    ).length !== 1
  )
    throw new Error(
      `${binding.serviceName}: these labels also select another workload. Choose an explicit selector in the Kubernetes manifest.`
    );
  if (
    documents.some(
      (resource) =>
        resource.kind === "Service" &&
        resource.metadata.name === name &&
        (resource.metadata.namespace || "default") ===
          (workload.metadata.namespace || "default")
    )
  )
    throw new Error(
      `${binding.serviceName}: a Service with this name already exists. Edit it in the Kubernetes manifest.`
    );
  documents.push({
    apiVersion: "v1",
    kind: "Service",
    metadata: {
      name,
      ...(workload.metadata.namespace
        ? { namespace: workload.metadata.namespace }
        : {})
    },
    spec: {
      type: settings.type,
      selector: { ...labels },
      ports: servicePorts({}, settings)
    }
  });
}
