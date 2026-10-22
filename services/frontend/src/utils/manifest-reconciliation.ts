import type { IServiceNodeItem } from "../types";
import type { ManifestImport } from "./manifests";
import { mountParts, portParts, kubernetesIdentity } from "./container-values";

const shared = new Set([
  "image",
  "command",
  "entrypoint",
  "working_dir",
  "environment",
  "expose",
  "user",
  "privileged",
  "read_only",
  "cap_add",
  "cap_drop",
  "stdin_open",
  "tty",
  "network_mode",
  "dns",
  "volumes"
]);

/** Kubernetes text owns its projection; unrelated Compose settings remain saved. */
export function preserveComposeSettings(
  imported: ManifestImport,
  existing: Record<string, any>,
  networks: Record<string, any> = {}
): ManifestImport {
  if (imported.replaceSource || imported.type !== "KUBERNETES") return imported;
  const byName = new Map(
    Object.values(existing)
      .filter((node) => node.type === "SERVICE")
      .map((node: IServiceNodeItem) => [
        node.canvasConfig.node_name,
        node.serviceConfig
      ])
  );
  const existingVolumes = Object.fromEntries(
    Object.values(existing)
      .filter((node) => node.type === "VOLUME")
      .map((node) => [node.canvasConfig.node_name, node.volumeConfig])
  );
  const aliases = new Map<string, string>();
  const volumes = { ...existingVolumes };
  for (const [logical, definition] of Object.entries(imported.data.volumes)) {
    const matches = Object.keys(existingVolumes).filter(
      (name) =>
        (existingVolumes[name].name || kubernetesIdentity(name)) ===
        definition.name
    );
    const previous = matches.includes(logical)
      ? logical
      : matches.length === 1
        ? matches[0]
        : undefined;
    aliases.set(logical, previous ?? logical);
    if (!previous) volumes[logical] = definition;
  }
  const services = Object.fromEntries(
    Object.entries(imported.data.services).map(([name, config]) => {
      const mapped = { ...config };
      if (Array.isArray(mapped.volumes))
        mapped.volumes = mapped.volumes.map((mount: any) =>
          typeof mount === "object" && aliases.has(mount.source)
            ? { ...mount, source: aliases.get(mount.source) }
            : mount
        ) as any;
      const previous = byName.get(name);
      if (!previous) return [name, mapped];
      const opaque = Object.fromEntries(
        Object.entries(previous).filter(
          ([key]) => !shared.has(key) && key !== "deploy"
        )
      );
      const deploy = Object.fromEntries(
        Object.entries(previous.deploy ?? {}).filter(
          ([key]) => key !== "resources" && key !== "replicas"
        )
      );
      const resources = Object.fromEntries(
        Object.entries(previous.deploy?.resources ?? {})
          .map(([kind, values]) => [
            kind,
            Object.fromEntries(
              Object.entries(values ?? {}).filter(
                ([key]) => !["cpus", "memory"].includes(key)
              )
            )
          ])
          .filter(([, values]) => Object.keys(values).length)
      );
      const nextDeploy = { ...deploy, ...config.deploy };
      if (Object.keys(resources).length)
        nextDeploy.resources = Object.fromEntries(
          [
            ...new Set([
              ...Object.keys(resources),
              ...Object.keys(config.deploy?.resources ?? {})
            ])
          ].map((kind) => [
            kind,
            { ...resources[kind], ...(config.deploy?.resources as any)?.[kind] }
          ])
        );
      if (Array.isArray(previous.ports)) {
        const oldTargets = [
          ...new Set(
            [...previous.ports, ...(previous.expose ?? [])].map((port) => {
              const parts = portParts(port);
              return `${parts.containerPort}/${parts.protocol || "tcp"}`;
            })
          )
        ];
        const nextTargets = (mapped.expose ?? []).map((port) => {
          const parts = portParts(port);
          return `${parts.containerPort}/${parts.protocol || "tcp"}`;
        });
        opaque.ports = previous.ports.map((port) => {
          const parts = portParts(port),
            target = `${parts.containerPort}/${parts.protocol || "tcp"}`;
          const next = nextTargets.includes(target)
            ? target
            : nextTargets[oldTargets.indexOf(target)];
          if (!next)
            throw new Error(
              `${name}: a removed Kubernetes port is still published by Compose. Edit the Compose mapping first.`
            );
          const [number, protocol] = next.split("/");
          return typeof port === "object"
            ? {
                ...(port as Record<string, unknown>),
                target: Number(number),
                protocol
              }
            : `${parts.hostIP ? `${parts.hostIP.includes(":") ? `[${parts.hostIP}]` : parts.hostIP}:` : ""}${parts.hostPort ? `${parts.hostPort}:` : ""}${number}${protocol !== "tcp" ? `/${protocol}` : ""}`;
        }) as any;
      }
      // Keep original mount syntax when the mapped source/target intent is unchanged.
      if (
        Array.isArray(previous.volumes) &&
        Array.isArray(mapped.volumes) &&
        JSON.stringify(previous.volumes.map(mountParts)) ===
          JSON.stringify(mapped.volumes.map(mountParts))
      )
        mapped.volumes = previous.volumes;
      return [
        name,
        {
          ...opaque,
          ...mapped,
          ...(Object.keys(nextDeploy).length ? { deploy: nextDeploy } : {})
        }
      ];
    })
  );
  const source = { ...imported.source };
  if (source.kubernetes)
    source.kubernetes = {
      ...source.kubernetes,
      volumeConfigs: volumes,
      bindings: source.kubernetes.bindings.map((binding) => ({
        ...binding,
        config: structuredClone(services[binding.serviceName])
      }))
    };
  return {
    ...imported,
    source,
    data: {
      services,
      volumes,
      networks: {
        ...Object.fromEntries(
          Object.values(networks).map((network) => [
            network.canvasConfig.node_name,
            network.networkConfig
          ])
        ),
        ...imported.data.networks
      }
    }
  };
}
