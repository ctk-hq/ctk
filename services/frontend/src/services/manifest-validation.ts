import Ajv2020 from "ajv/dist/2020";
import composeSchema from "../schemas/compose.json";
import kubernetesSchema from "../schemas/kubernetes.json";
import type { IGeneratePayload } from "../types";
import {
  absoluteContainerPath,
  cpuQuantity,
  isObject,
  memoryBytes,
  mountParts,
  portParts
} from "../utils/container-values";
import { referencedVariables } from "../utils/variables";
import { serviceExposureIssues } from "./service-exposure-validation";
import { isIPAddress } from "../utils/ip-address";
import {
  selectsWorkload,
  workloadTemplate
} from "../utils/kubernetes-services";

export type ManifestTarget = "DOCKER_COMPOSE" | "KUBERNETES";
export interface ManifestDiagnostic {
  code: string;
  severity: "error" | "warning" | "info";
  sourcePath: string;
  target: ManifestTarget;
  reason: string;
  action: string;
  blocksExport: boolean;
  canExclude?: boolean;
  fingerprint?: string;
}
export const pointer = (value: string) =>
  value.replaceAll("~", "~0").replaceAll("/", "~1");
export function diagnostic(
  code: string,
  sourcePath: string,
  target: ManifestTarget,
  reason: string,
  action: string,
  severity: ManifestDiagnostic["severity"] = "error"
): ManifestDiagnostic {
  return {
    code,
    sourcePath,
    target,
    reason,
    action,
    severity,
    blocksExport: severity === "error"
  };
}

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  validateFormats: false
});
const composeValidator = ajv.compile(composeSchema);
ajv.addSchema(kubernetesSchema);
const kubernetesValidators = new Map<string, ReturnType<typeof ajv.compile>>();
const kubernetesSchemas = new Map<string, string>();
const portRange = (value: string, allowZero = false) => {
  if (!/^\d+(?:-\d+)?$/.test(value)) return false;
  const parts = value.split("-").map(Number);
  return (
    parts.every(
      (port) =>
        Number.isInteger(port) && port >= (allowZero ? 0 : 1) && port <= 65535
    ) &&
    (parts.length === 1 || parts[0] <= parts[1])
  );
};
for (const [key, schema] of Object.entries(kubernetesSchema.definitions)) {
  for (const gvk of (schema as any)["x-kubernetes-group-version-kind"] ?? []) {
    kubernetesSchemas.set(
      `${gvk.group ? `${gvk.group}/` : ""}${gvk.version}/${gvk.kind}`,
      `${kubernetesSchema.$id}#/definitions/${key}`
    );
  }
}

function schemaDiagnostics(
  value: unknown,
  validate: ReturnType<typeof ajv.compile>,
  path: string,
  target: ManifestTarget
) {
  if (validate(value)) return [];
  // Do not include values or source excerpts: manifests can contain credentials.
  return (validate.errors ?? []).map((error) =>
    diagnostic(
      "SCHEMA_INVALID",
      `${path}${error.instancePath}${error.params.additionalProperty !== undefined ? `/${pointer(error.params.additionalProperty)}` : error.params.missingProperty !== undefined ? `/${pointer(error.params.missingProperty)}` : ""}`,
      target,
      `Schema validation failed: ${error.message}.`,
      error.keyword === "required"
        ? `Supply ${error.params.missingProperty}.`
        : error.keyword === "additionalProperties"
          ? `Check the field ${error.params.additionalProperty} against the pinned target schema.`
          : "Correct this field before exporting."
    )
  );
}

export function validateCompose(
  document: Record<string, any>
): ManifestDiagnostic[] {
  const target = "DOCKER_COMPOSE";
  const result = schemaDiagnostics(document, composeValidator, "", target);
  const services = isObject(document.services) ? document.services : {};
  const volumes = isObject(document.volumes) ? document.volumes : {};
  const networks = isObject(document.networks) ? document.networks : {};
  const add = (
    code: string,
    path: string,
    message: string,
    action = "Repair the reference before exporting."
  ) => result.push(diagnostic(code, path, target, message, action));
  const dependencies = new Map<string, string[]>();
  for (const [section, definitions] of [
    ["volumes", volumes],
    ["networks", networks]
  ] as const)
    for (const [name, value] of Object.entries(definitions))
      if (value?.external === true) {
        for (const key of Object.keys(value))
          if (!["external", "name"].includes(key) && !key.startsWith("x-"))
            add(
              "EXTERNAL_RESOURCE_OPTIONS",
              `/${section}/${pointer(name)}/${pointer(key)}`,
              "External resources may only specify external, name and extension metadata.",
              "Remove provisioning options from the existing-resource reference."
            );
      }
  for (const [name, service] of Object.entries(services)) {
    if (!isObject(service)) continue;
    const path = `/services/${pointer(name)}`;
    if (
      !service.image &&
      !service.build &&
      !service.provider &&
      !service.extends
    )
      add(
        "IMAGE_OR_BUILD_REQUIRED",
        `${path}/image`,
        "A Compose service needs an image, build definition or supported provider.",
        "Supply the service's image or build definition."
      );
    if (
      service.image &&
      (!/^\S+$/.test(service.image) ||
        service.image.endsWith(":") ||
        service.image.endsWith("@"))
    )
      add(
        "IMAGE_INVALID",
        `${path}/image`,
        "The image reference is malformed.",
        "Use a complete image name, tag or digest reference."
      );
    const deps = Array.isArray(service.depends_on)
      ? service.depends_on
      : Object.keys(service.depends_on ?? {});
    dependencies.set(name, deps);
    for (const dependency of deps)
      if (!Object.hasOwn(services, dependency))
        add(
          "REFERENCE_MISSING",
          `${path}/depends_on`,
          `Dependency ${dependency} does not exist.`
        );
    for (const field of ["network_mode", "ipc", "pid"])
      if (
        typeof service[field] === "string" &&
        service[field].startsWith("service:") &&
        !Object.hasOwn(services, service[field].slice(8))
      )
        add(
          "REFERENCE_MISSING",
          `${path}/${field}`,
          "The shared namespace refers to a missing service."
        );
    for (const link of [
      ...(service.links ?? []),
      ...(service.volumes_from ?? [])
    ])
      if (
        !String(link).startsWith("container:") &&
        !Object.hasOwn(services, String(link).split(":")[0])
      )
        add(
          "REFERENCE_MISSING",
          path,
          "A linked service or volume source does not exist."
        );
    if (
      service.extends?.service &&
      !service.extends.file &&
      !Object.hasOwn(services, service.extends.service)
    )
      add(
        "REFERENCE_MISSING",
        `${path}/extends/service`,
        "The extended service does not exist in this document."
      );
    for (const network of Array.isArray(service.networks)
      ? service.networks
      : Object.keys(service.networks ?? {}))
      if (network !== "default" && !Object.hasOwn(networks, network))
        add(
          "REFERENCE_MISSING",
          `${path}/networks`,
          `Network ${network} does not exist.`
        );
    const targets = new Set<string>();
    for (const key of ["ports", "expose"])
      for (const [index, value] of (Array.isArray(service[key])
        ? service[key]
        : []
      ).entries()) {
        if (referencedVariables(value).length) continue;
        const parts = portParts(value);
        if (parts.hostIP && !isIPAddress(parts.hostIP))
          add(
            "PORT_HOST_IP_INVALID",
            `${path}/${key}/${index}`,
            "The host binding needs a valid IPv4 or IPv6 address.",
            "Correct the host IP address."
          );
        if (
          (key === "expose" && (parts.hostPort || parts.hostIP)) ||
          (parts.hostIP.includes(":") &&
            typeof value === "string" &&
            !value.startsWith("[")) ||
          !portRange(parts.containerPort) ||
          (parts.hostPort && !portRange(parts.hostPort, true)) ||
          (parts.protocol &&
            !["tcp", "udp", "sctp"].includes(parts.protocol)) ||
          (typeof value === "string" && value.split("/").length > 2)
        )
          add(
            "PORT_INVALID",
            `${path}/${key}/${index}`,
            "A port mapping contains an invalid number, range or protocol.",
            "Use ports from 1 to 65535, valid ordered ranges and TCP/UDP/SCTP."
          );
      }
    for (const [index, value] of (Array.isArray(service.volumes)
      ? service.volumes
      : []
    ).entries()) {
      const mount = mountParts(value);
      if (isObject(value) && value.type === "bind" && !mount.name)
        add(
          "MOUNT_SOURCE_REQUIRED",
          `${path}/volumes/${index}/source`,
          "A bind mount needs a host source path.",
          "Supply its source path."
        );
      if (isObject(value) && value.type === "tmpfs" && mount.name)
        add(
          "MOUNT_SOURCE_INVALID",
          `${path}/volumes/${index}/source`,
          "A tmpfs mount cannot use a persistent source.",
          "Remove the source from the memory mount."
        );
      if (
        !absoluteContainerPath(mount.containerPath) &&
        !referencedVariables(mount.containerPath).length
      )
        add(
          "MOUNT_TARGET_REQUIRED",
          `${path}/volumes/${index}`,
          "A volume mount needs an absolute container destination.",
          "Set the container path in the service's Data tab."
        );
      if (targets.has(mount.containerPath))
        add(
          "MOUNT_TARGET_DUPLICATE",
          `${path}/volumes/${index}`,
          "Multiple mounts use the same container destination.",
          "Use a different container destination for each mount."
        );
      targets.add(mount.containerPath);
      const named =
        mount.name &&
        !/^(?:[./~]|[A-Za-z]:[\\/])/.test(mount.name) &&
        (!isObject(value) || value.type === "volume" || !value.type);
      if (
        named &&
        !referencedVariables(mount.name).length &&
        !Object.hasOwn(volumes, mount.name)
      )
        add(
          "REFERENCE_MISSING",
          `${path}/volumes/${index}`,
          `Volume ${mount.name} does not exist.`
        );
    }
    for (const section of ["configs", "secrets"])
      for (const [index, reference] of (Array.isArray(service[section])
        ? service[section]
        : []
      ).entries()) {
        const source =
          typeof reference === "string" ? reference : reference.source;
        if (!Object.hasOwn(document[section] ?? {}, source))
          add(
            "REFERENCE_MISSING",
            `${path}/${section}/${index}`,
            `The referenced ${section} entry does not exist.`
          );
      }
    if (service.container_name && Number(service.deploy?.replicas) > 1)
      add(
        "FIXED_NAME_SCALE",
        `${path}/container_name`,
        "A fixed container name cannot be used with multiple replicas.",
        "Remove the fixed container name or use one replica."
      );
  }
  const visiting = new Set<string>(),
    visited = new Set<string>();
  const visit = (name: string) => {
    if (visiting.has(name)) {
      add(
        "DEPENDENCY_CYCLE",
        `/services/${pointer(name)}/depends_on`,
        "Service dependencies contain a cycle.",
        "Remove a dependency from the cycle."
      );
      return;
    }
    if (visited.has(name)) return;
    visiting.add(name);
    for (const dependency of dependencies.get(name) ?? []) visit(dependency);
    visiting.delete(name);
    visited.add(name);
  };
  for (const name of dependencies.keys()) visit(name);
  return result;
}

const populated = (value: any): boolean =>
  value !== undefined &&
  value !== null &&
  value !== "" &&
  (!Array.isArray(value) || value.length > 0) &&
  (!isObject(value) || Object.keys(value).length > 0);
export function conversionDiagnostics(
  payload: IGeneratePayload
): ManifestDiagnostic[] {
  const target = "KUBERNETES";
  const result: ManifestDiagnostic[] = [];
  const nativeBindings = new Map(
    payload.manifestSource?.kubernetes?.bindings.map((binding) => [
      binding.nodeKey && payload.nodeNames
        ? payload.nodeNames[binding.nodeKey]
        : binding.serviceName,
      binding.config
    ]) ?? []
  );
  const add = (
    code: string,
    path: string,
    reason: string,
    action: string,
    severity: ManifestDiagnostic["severity"] = "error"
  ) => result.push(diagnostic(code, path, target, reason, action, severity));
  const unsupported = (
    value: any,
    path: string,
    reason = "This Compose setting has no implemented Kubernetes conversion."
  ) => {
    if (!populated(value)) return;
    if (isObject(value)) {
      for (const [key, entry] of Object.entries(value))
        unsupported(entry, `${path}/${pointer(key)}`, reason);
      return;
    }
    const item = diagnostic(
      "CONVERSION_UNSUPPORTED",
      path,
      target,
      reason,
      "Configure the equivalent in Kubernetes source, or explicitly exclude this setting from Kubernetes export."
    );
    item.canExclude = true;
    item.fingerprint = JSON.stringify(value);
    if (
      payload.manifestSource?.exclusions?.some(
        (entry) =>
          entry.target === target &&
          entry.sourcePath === path &&
          entry.fingerprint === item.fingerprint
      )
    ) {
      item.severity = "warning";
      item.blocksExport = false;
      item.reason = `${reason} Explicitly excluded from Kubernetes export; the source value remains saved.`;
    }
    result.push(item);
  };
  if (referencedVariables(payload.data).length)
    add(
      "VARIABLE_UNRESOLVED",
      "/",
      "Kubernetes export cannot resolve Compose variables.",
      "Use concrete non-secret configuration or native Secret/ConfigMap references before exporting."
    );
  const supported = new Set([
    "image",
    "command",
    "entrypoint",
    "working_dir",
    "environment",
    "ports",
    "expose",
    "volumes",
    "deploy",
    "labels",
    "pull_policy",
    "user",
    "privileged",
    "read_only",
    "cap_add",
    "cap_drop",
    "stdin_open",
    "tty",
    "network_mode",
    "dns",
    "build",
    "restart"
  ]);
  for (const [name, original] of Object.entries(payload.data.services)) {
    const service = original as Record<string, any>;
    const before = nativeBindings.get(name) as Record<string, any> | undefined;
    const path = `/services/${pointer(name)}`;
    const exposure = payload.kubernetesServices?.[name];
    if (exposure) {
      for (const issue of serviceExposureIssues(exposure))
        add(
          issue.code,
          `${path}/kubernetesService${issue.path}`,
          issue.reason,
          "Open Networking and correct the Kubernetes Service settings."
        );
      if (exposure.type === "LoadBalancer")
        add(
          "LOAD_BALANCER_PROVIDER",
          `${path}/kubernetesService/type`,
          "A LoadBalancer Service requires a cluster provider to provision an external address.",
          "Check provider support and provisioning status after applying.",
          "warning"
        );
      if (exposure.type === "NodePort")
        add(
          "NODE_PORT_ACCESS",
          `${path}/kubernetesService/type`,
          "NodePort access depends on reachable node addresses, the cluster port range and firewall rules.",
          "Verify node access and any explicitly requested node ports.",
          "info"
        );
    }
    // Untouched native projections are already represented by their preserved resources.
    const changed = (key: string) =>
      !before || JSON.stringify(before[key]) !== JSON.stringify(service[key]);
    if (!before && (!service.image || typeof service.image !== "string"))
      add(
        "IMAGE_REQUIRED",
        `${path}/image`,
        "Kubernetes needs a usable image reference.",
        "Supply an image that is available to the cluster."
      );
    for (const [key, value] of Object.entries(service))
      if (!supported.has(key)) {
        if (changed(key)) unsupported(value, `${path}/${pointer(key)}`);
        else if (populated(value))
          add(
            "COMPOSE_SETTING_RETAINED",
            `${path}/${pointer(key)}`,
            "This saved Compose setting is kept separately from the authoritative native Kubernetes source.",
            "Edit its Kubernetes equivalent in the native manifest.",
            "warning"
          );
      }
    if (changed("build") && populated(service.build))
      add(
        "BUILD_EXTERNAL",
        `${path}/build`,
        "Build settings remain in Compose. Kubernetes runs the supplied image.",
        "Build and make the image available to the cluster before deployment.",
        "warning"
      );
    if (changed("restart") && populated(service.restart)) {
      if (service.restart === "always")
        add(
          "RESTART_CONTROLLER",
          `${path}/restart`,
          "The Deployment controller keeps this workload running; manual-stop semantics differ from Compose.",
          "Use Kubernetes scaling to stop this workload.",
          "warning"
        );
      else
        unsupported(
          service.restart,
          `${path}/restart`,
          "This restart policy cannot be represented by a Deployment."
        );
    }
    if (changed("network_mode") && populated(service.network_mode)) {
      if (service.network_mode === "host")
        add(
          "HOST_NETWORK",
          `${path}/network_mode`,
          "This workload uses the Kubernetes node network.",
          "Verify node access, port conflicts and cluster policy.",
          "warning"
        );
      else unsupported(service.network_mode, `${path}/network_mode`);
    }
    if (
      changed("user") &&
      populated(service.user) &&
      !/^\d+(?::\d+)?$/.test(service.user)
    )
      add(
        "USER_NUMERIC_REQUIRED",
        `${path}/user`,
        "A named Compose user cannot be resolved to a Kubernetes numeric identity.",
        "Supply a numeric UID and optional GID, or configure native securityContext."
      );
    if (
      changed("pull_policy") &&
      populated(service.pull_policy) &&
      ![
        "always",
        "never",
        "missing",
        "if_not_present",
        "if-not-present"
      ].includes(service.pull_policy)
    )
      unsupported(service.pull_policy, `${path}/pull_policy`);
    const deploy = service.deploy ?? {};
    if (
      deploy.replicas !== undefined &&
      (!/^\d+$/.test(String(deploy.replicas)) ||
        !Number.isSafeInteger(Number(deploy.replicas)))
    )
      add(
        "REPLICAS_INVALID",
        `${path}/deploy/replicas`,
        "Replicas must be a nonnegative integer.",
        "Correct the replica count."
      );
    if (changed("deploy")) {
      for (const [key, value] of Object.entries(deploy))
        if (!["replicas", "resources"].includes(key))
          unsupported(value, `${path}/deploy/${pointer(key)}`);
      for (const [kind, values] of Object.entries(deploy.resources ?? {})) {
        if (!["limits", "reservations"].includes(kind)) {
          unsupported(values, `${path}/deploy/resources/${pointer(kind)}`);
          continue;
        }
        for (const [key, value] of Object.entries(values as object))
          if (!["cpus", "memory"].includes(key))
            unsupported(
              value,
              `${path}/deploy/resources/${kind}/${pointer(key)}`
            );
        for (const [key, convert] of [
          ["cpus", cpuQuantity],
          ["memory", memoryBytes]
        ] as const)
          if (populated((values as any)[key])) {
            try {
              convert((values as any)[key]);
            } catch (error) {
              add(
                "RESOURCE_QUANTITY",
                `${path}/deploy/resources/${kind}/${key}`,
                (error as Error).message,
                "Correct the resource amount."
              );
            }
          }
      }
      for (const [key, convert] of [
        ["cpus", cpuQuantity],
        ["memory", memoryBytes]
      ] as const) {
        try {
          const limit = convert(deploy.resources?.limits?.[key]);
          const request = convert(deploy.resources?.reservations?.[key]);
          if (
            limit !== undefined &&
            request !== undefined &&
            Number(request) > Number(limit)
          )
            add(
              "RESOURCE_REQUEST_EXCEEDS_LIMIT",
              `${path}/deploy/resources/reservations/${key}`,
              "The resource request exceeds its limit.",
              "Lower the request or increase the limit."
            );
        } catch {
          /* Reported at the individual quantity above. */
        }
      }
    }
    for (const key of ["ports", "expose"])
      if (changed(key))
        for (const [index, value] of (Array.isArray(service[key])
          ? service[key]
          : []
        ).entries()) {
          const parts = portParts(value);
          if (
            !/^\d+$/.test(parts.containerPort) ||
            Number(parts.containerPort) < 1 ||
            Number(parts.containerPort) > 65535 ||
            (!exposure &&
              parts.hostPort &&
              (!/^\d+$/.test(parts.hostPort) ||
                Number(parts.hostPort) < 1 ||
                Number(parts.hostPort) > 65535))
          )
            add(
              "PORT_INVALID",
              `${path}/${key}/${index}`,
              "Kubernetes conversion requires individual ports from 1 to 65535.",
              "Expand port ranges into individual mappings and correct invalid port numbers."
            );
          if (
            parts.protocol &&
            !["tcp", "udp", "sctp"].includes(parts.protocol.toLowerCase())
          )
            add(
              "PORT_PROTOCOL",
              `${path}/${key}/${index}`,
              "The port protocol is unsupported.",
              "Use TCP, UDP or SCTP."
            );
          if (key === "ports" && parts.hostPort && !exposure)
            add(
              "PORT_CLUSTER_INTERNAL",
              `${path}/${key}/${index}`,
              "A published Compose port becomes a cluster-internal Service port; host binding and public exposure are not reproduced.",
              "Open Networking and choose an explicit Kubernetes Service type for external access.",
              "warning"
            );
          if (isObject(value)) {
            for (const [option, setting] of Object.entries(value))
              if (!["target", "published", "protocol"].includes(option)) {
                if (exposure)
                  add(
                    "COMPOSE_BINDING_RETAINED",
                    `${path}/${key}/${index}/${pointer(option)}`,
                    "This Compose binding option remains in Compose; the explicit Kubernetes Service settings control Kubernetes exposure.",
                    "Review the Kubernetes Service ports in Networking.",
                    "warning"
                  );
                else
                  unsupported(
                    setting,
                    `${path}/${key}/${index}/${pointer(option)}`
                  );
              }
          } else if (typeof value === "string" && value.split(":").length > 2) {
            if (exposure)
              add(
                "COMPOSE_BINDING_RETAINED",
                `${path}/${key}/${index}/host_ip`,
                "The Compose host IP remains in Compose; Kubernetes exposure uses the explicit Service settings.",
                "Review the Kubernetes Service ports in Networking.",
                "warning"
              );
            else
              unsupported(
                value,
                `${path}/${key}/${index}/host_ip`,
                "The Compose host IP binding is not represented in Kubernetes."
              );
          }
        }
    if (changed("volumes"))
      for (const [index, value] of (Array.isArray(service.volumes)
        ? service.volumes
        : []
      ).entries()) {
        const mount = mountParts(value),
          mountPath = `${path}/volumes/${index}`;
        if (
          isObject(value) &&
          !["bind", "volume", "tmpfs"].includes(value.type)
        )
          add(
            "MOUNT_TYPE_UNSUPPORTED",
            `${mountPath}/type`,
            "This mount source type has no implemented Kubernetes conversion.",
            "Configure an equivalent storage source in native Kubernetes."
          );
        if (isObject(value) && value.type === "tmpfs") {
          add(
            "TMPFS_LIFETIME",
            mountPath,
            "Memory storage has Pod lifetime in Kubernetes and container lifetime in Compose.",
            "Review recreation and data-loss behavior.",
            "warning"
          );
          for (const option of Object.keys(value.tmpfs ?? {}))
            if (option !== "size")
              unsupported(
                value.tmpfs[option],
                `${mountPath}/tmpfs/${pointer(option)}`
              );
        } else if (!mount.name)
          add(
            "STORAGE_LIFETIME_REQUIRED",
            mountPath,
            "Anonymous Compose storage cannot be assumed to have Kubernetes emptyDir lifetime.",
            "Use an explicitly configured named volume or choose storage in native Kubernetes source."
          );
        else if (
          /^(?:[./~]|[A-Za-z]:[\\/])/.test(mount.name) ||
          (isObject(value) && value.type === "bind")
        ) {
          if (!mount.name.startsWith("/"))
            add(
              "HOST_PATH_REQUIRED",
              mountPath,
              "A Compose relative or Windows host path is not a Kubernetes node path.",
              "Supply an absolute node path in native Kubernetes source."
            );
          else
            add(
              "HOST_PATH_NODE",
              mountPath,
              "This host path must exist on every eligible Kubernetes node.",
              "Verify the node path and placement before deploying.",
              "warning"
            );
          if (isObject(value) && populated(value.bind))
            unsupported(value.bind, `${mountPath}/bind`);
        }
        if (isObject(value)) {
          for (const [option, setting] of Object.entries(value))
            if (
              ![
                "type",
                "source",
                "target",
                "read_only",
                "tmpfs",
                "bind"
              ].includes(option)
            )
              unsupported(setting, `${mountPath}/${pointer(option)}`);
        } else if (typeof value === "string") {
          const modes = mount.accessMode
            .split(",")
            .filter((mode) => mode && mode !== "ro" && mode !== "rw");
          if (modes.length) unsupported(modes, `${mountPath}/options`);
        }
      }
    if (changed("environment")) {
      const env = service.environment;
      const inherited = Array.isArray(env)
        ? env.some((value: string) => !value.includes("="))
        : Object.values(env ?? {}).some((value) => value === null);
      if (inherited)
        add(
          "ENV_INHERITED",
          `${path}/environment`,
          "Inherited or unset Compose environment values have no resolved Kubernetes value.",
          "Supply a concrete value or a native configuration reference."
        );
      if (
        Array.isArray(env) &&
        new Set(env.map((entry: string) => entry.split("=", 1)[0])).size !==
          env.length
      )
        add(
          "ENV_DUPLICATE",
          `${path}/environment`,
          "Environment variable names are duplicated.",
          "Keep one value for each environment variable."
        );
    }
  }
  // Network definitions also carry isolation and driver intent, even if membership is implicit.
  for (const [name, value] of Object.entries(payload.data.networks))
    unsupported(
      value,
      `/networks/${pointer(name)}`,
      "Docker network configuration and isolation are not represented by Kubernetes Services."
    );
  for (const [key, value] of Object.entries(
    payload.manifestSource?.compose ?? {}
  )) {
    if (key === "name" || key.startsWith("x-")) {
      if (populated(value))
        add(
          "COMPOSE_METADATA",
          `/${pointer(key)}`,
          "This Compose document metadata remains in Compose.",
          "Review the Kubernetes resource metadata separately.",
          "info"
        );
    } else unsupported(value, `/${pointer(key)}`);
  }
  return result;
}

/** Diagnose native execution policies that the Compose projection cannot carry. */
export function nativeComposeDiagnostics(
  payload: IGeneratePayload
): ManifestDiagnostic[] {
  const result: ManifestDiagnostic[] = [];
  const target = "DOCKER_COMPOSE";
  const unsupported = (
    value: any,
    path: string,
    reason = "This native Kubernetes setting remains saved in Kubernetes and is not represented in Compose."
  ) => {
    if (!populated(value)) return;
    if (isObject(value)) {
      for (const [key, child] of Object.entries(value))
        unsupported(child, `${path}/${pointer(key)}`, reason);
      return;
    }
    const item = diagnostic(
      "NATIVE_SETTING_UNREPRESENTED",
      path,
      target,
      reason,
      "Configure a Compose equivalent, or explicitly exclude this native setting from Compose export."
    );
    item.canExclude = true;
    item.fingerprint = JSON.stringify(value);
    if (
      payload.manifestSource?.exclusions?.some(
        (entry) =>
          entry.target === target &&
          entry.sourcePath === path &&
          entry.fingerprint === item.fingerprint
      )
    ) {
      item.severity = "warning";
      item.blocksExport = false;
      item.reason += " Explicitly excluded from Compose export.";
    }
    result.push(item);
  };
  for (const [index, resource] of (
    payload.manifestSource?.kubernetes?.documents ?? []
  ).entries()) {
    const path = `/documents/${index}`;
    const template =
      resource.kind === "Pod"
        ? resource
        : resource.kind === "CronJob"
          ? resource.spec?.jobTemplate?.spec?.template
          : resource.spec?.template;
    const bindings =
      payload.manifestSource?.kubernetes?.bindings.filter(
        (binding) => binding.documentIndex === index
      ) ?? [];
    if (
      bindings.length &&
      !bindings.some((binding) =>
        Object.hasOwn(
          payload.data.services,
          binding.nodeKey && payload.nodeNames
            ? payload.nodeNames[binding.nodeKey]
            : binding.serviceName
        )
      )
    )
      continue;
    if (resource.kind === "PersistentVolumeClaim") {
      result.push(
        diagnostic(
          "NATIVE_STORAGE_EXTERNAL",
          path,
          target,
          "Kubernetes storage becomes an external Compose volume with separately provisioned data.",
          "Create or select the actual Docker volume before running Compose.",
          "warning"
        )
      );
      continue;
    }
    if (!template?.spec) {
      unsupported(
        resource.kind,
        `${path}/kind`,
        "This native Kubernetes resource has no implemented Compose representation."
      );
      for (const [key, value] of Object.entries(resource))
        if (!["apiVersion", "kind", "metadata"].includes(key))
          unsupported(value, `${path}/${pointer(key)}`);
      continue;
    }
    if (!["Deployment", "Pod"].includes(resource.kind))
      unsupported(
        resource.kind,
        `${path}/kind`,
        "Compose services do not reproduce this controller's identity, scheduling or completion behavior."
      );
    if (resource.spec?.replicas !== undefined)
      result.push(
        diagnostic(
          "REPLICA_RUNTIME",
          `${path}/spec/replicas`,
          target,
          "Compose replication and Kubernetes scheduling have different runtime prerequisites.",
          "Review the selected Compose runtime and storage sharing.",
          "warning"
        )
      );
    const pod = template.spec;
    if ((pod.containers ?? []).length > 1)
      unsupported(
        pod.containers.map((container: any) => container.name),
        `${path}/spec/containers`,
        "Separate Compose services do not share a Kubernetes Pod's network, process and storage lifecycle."
      );
    for (const [key, value] of Object.entries(resource.spec ?? {}))
      if (
        resource.kind !== "Pod" &&
        !["template", "replicas", "selector", "jobTemplate"].includes(key)
      )
        unsupported(value, `${path}/spec/${pointer(key)}`);
    const mappedPod = new Set([
      "containers",
      "volumes",
      "hostNetwork",
      "dnsConfig"
    ]);
    for (const [key, value] of Object.entries(pod))
      if (!mappedPod.has(key))
        unsupported(value, `${path}/pod/${pointer(key)}`);
    for (const [key, value] of Object.entries(pod.dnsConfig ?? {}))
      if (key !== "nameservers")
        unsupported(value, `${path}/pod/dnsConfig/${pointer(key)}`);
    for (const [containerIndex, container] of (
      pod.containers ?? []
    ).entries()) {
      const cp = `${path}/containers/${containerIndex}`;
      const projection = payload.manifestSource?.kubernetes?.bindings.find(
        (binding) =>
          binding.documentIndex === index &&
          binding.containerIndex === containerIndex
      )?.config;
      const mapped = new Set([
        "name",
        "image",
        "command",
        "args",
        "workingDir",
        "env",
        "ports",
        "resources",
        "securityContext",
        "volumeMounts",
        "stdin",
        "tty"
      ]);
      for (const [key, value] of Object.entries(container))
        if (!mapped.has(key)) unsupported(value, `${cp}/${pointer(key)}`);
      for (const [envIndex, entry] of (container.env ?? []).entries()) {
        if (entry.valueFrom)
          unsupported(entry.valueFrom, `${cp}/env/${envIndex}/valueFrom`);
        if (
          typeof entry.value === "string" &&
          /(?<!\$)\$\([A-Za-z_][A-Za-z0-9_]*\)/.test(entry.value)
        )
          unsupported(
            entry.value,
            `${cp}/env/${envIndex}/value`,
            "Kubernetes environment expansion is not performed by Compose."
          );
      }
      for (const field of ["command", "args"])
        if (
          (container[field] ?? []).some((value: string) =>
            /(?<!\$)\$\([A-Za-z_][A-Za-z0-9_]*\)/.test(value)
          )
        )
          unsupported(
            container[field],
            `${cp}/${field}`,
            "Kubernetes command/argument variable expansion is not performed by Compose."
          );
      for (const [key, value] of Object.entries(
        container.securityContext ?? {}
      ))
        if (
          ![
            "runAsUser",
            "runAsGroup",
            "privileged",
            "readOnlyRootFilesystem",
            "capabilities"
          ].includes(key) ||
          (key === "runAsGroup" &&
            container.securityContext.runAsUser === undefined)
        )
          unsupported(value, `${cp}/securityContext/${pointer(key)}`);
      for (const [kind, values] of Object.entries(container.resources ?? {})) {
        if (!["limits", "requests"].includes(kind)) {
          unsupported(values, `${cp}/resources/${pointer(kind)}`);
          continue;
        }
        for (const [key, value] of Object.entries(values as object))
          if (
            !["cpu", "memory"].includes(key) ||
            (projection?.deploy?.resources as any)?.[
              kind === "requests" ? "reservations" : "limits"
            ]?.[key === "cpu" ? "cpus" : "memory"] === undefined
          )
            unsupported(value, `${cp}/resources/${kind}/${pointer(key)}`);
      }
      for (const [portIndex, port] of (container.ports ?? []).entries())
        for (const [key, value] of Object.entries(port))
          if (!["name", "containerPort", "protocol"].includes(key))
            unsupported(value, `${cp}/ports/${portIndex}/${pointer(key)}`);
      for (const [mountIndex, mount] of (
        container.volumeMounts ?? []
      ).entries())
        for (const [key, value] of Object.entries(mount))
          if (!["name", "mountPath", "readOnly"].includes(key))
            unsupported(
              value,
              `${cp}/volumeMounts/${mountIndex}/${pointer(key)}`
            );
    }
    for (const [volumeIndex, volume] of (pod.volumes ?? []).entries()) {
      if (volume.emptyDir !== undefined)
        unsupported(
          volume.emptyDir.medium || "disk",
          `${path}/pod/volumes/${volumeIndex}/lifetime`,
          "Kubernetes emptyDir and Compose volumes/tmpfs have different recreation and data lifetime behavior."
        );
      for (const [key, value] of Object.entries(volume))
        if (
          !["name", "persistentVolumeClaim", "hostPath", "emptyDir"].includes(
            key
          )
        )
          unsupported(
            value,
            `${path}/pod/volumes/${volumeIndex}/${pointer(key)}`
          );
      if (volume.emptyDir?.sizeLimit !== undefined)
        unsupported(
          volume.emptyDir.sizeLimit,
          `${path}/pod/volumes/${volumeIndex}/emptyDir/sizeLimit`
        );
      if (volume.hostPath?.type)
        unsupported(
          volume.hostPath.type,
          `${path}/pod/volumes/${volumeIndex}/hostPath/type`
        );
    }
  }
  return result;
}

const dnsLabel = (name: string) =>
  name.length <= 63 && /^[a-z0-9](?:[-a-z0-9]*[a-z0-9])?$/.test(name);
const dnsSubdomain = (name: string) =>
  name.length <= 253 && name.split(".").every(dnsLabel);
const labelPart = (name: string) =>
  name.length <= 63 &&
  /^[A-Za-z0-9](?:[-A-Za-z0-9_.]*[A-Za-z0-9])?$/.test(name);
function quantity(value: unknown): number | undefined {
  const match = String(value ?? "").match(
    /^(\d+(?:\.\d+)?|\.\d+)([eE][+-]?\d+|[EPTGMK]i|[numkMGTPE])?$/
  );
  if (!match) return undefined;
  const suffix = match[2] ?? "";
  const scale = suffix.endsWith("i")
    ? 1024 ** ("KMGTPE".indexOf(suffix[0]) + 1)
    : suffix.startsWith("e") || (suffix.startsWith("E") && suffix.length > 1)
      ? 10 ** Number(suffix.slice(1))
      : ({
          n: 1e-9,
          u: 1e-6,
          m: 1e-3,
          k: 1e3,
          M: 1e6,
          G: 1e9,
          T: 1e12,
          P: 1e15,
          E: 1e18
        }[suffix] ?? 1);
  const amount = Number(match[1]) * scale;
  return Number.isFinite(amount) ? amount : undefined;
}
export function validateLabels(
  labels: any,
  path: string
): ManifestDiagnostic[] {
  const result: ManifestDiagnostic[] = [];
  for (const [key, value] of Object.entries(labels ?? {})) {
    const parts = key.split("/");
    if (
      parts.length > 2 ||
      !labelPart(parts.at(-1)!) ||
      (parts.length === 2 && !dnsSubdomain(parts[0])) ||
      typeof value !== "string" ||
      (value !== "" && !labelPart(value))
    )
      result.push(
        diagnostic(
          "LABEL_INVALID",
          `${path}/${pointer(key)}`,
          "KUBERNETES",
          "Kubernetes label names and values must satisfy length and character restrictions.",
          "Use a qualified label key and a value of at most 63 characters."
        )
      );
  }
  return result;
}

export function validateKubernetes(
  documents: Record<string, any>[]
): ManifestDiagnostic[] {
  const result: ManifestDiagnostic[] = [];
  const add = (
    code: string,
    path: string,
    reason: string,
    action: string,
    severity: ManifestDiagnostic["severity"] = "error"
  ) =>
    result.push(diagnostic(code, path, "KUBERNETES", reason, action, severity));
  const identities = new Set<string>();
  const allocatedNodePorts = new Map<string, string>();
  for (const [index, resource] of documents.entries()) {
    const path = `/documents/${index}`,
      metadata = resource.metadata ?? {};
    const schemaKey = `${resource.apiVersion}/${resource.kind}`;
    let validator = kubernetesValidators.get(schemaKey);
    if (!validator && kubernetesSchemas.has(schemaKey)) {
      validator = ajv.compile({ $ref: kubernetesSchemas.get(schemaKey)! });
      kubernetesValidators.set(schemaKey, validator);
    }
    if (!validator)
      add(
        "API_SCHEMA_UNKNOWN",
        path,
        "This resource API has no pinned validation schema.",
        "Keep it in source until its API schema is supported."
      );
    else
      result.push(
        ...schemaDiagnostics(resource, validator, path, "KUBERNETES")
      );
    const identity = `${String(resource.apiVersion).split("/")[0]}/${resource.kind}/${metadata.namespace || "default"}/${metadata.name}`;
    if (identities.has(identity))
      add(
        "IDENTITY_COLLISION",
        `${path}/metadata/name`,
        "Multiple resources have the same Kubernetes identity.",
        "Choose distinct names before exporting."
      );
    identities.add(identity);
    if (
      typeof metadata.name !== "string" ||
      !(resource.kind === "Service"
        ? dnsLabel(metadata.name) && /^[a-z]/.test(metadata.name)
        : dnsSubdomain(metadata.name))
    )
      add(
        "NAME_INVALID",
        `${path}/metadata/name`,
        "The Kubernetes resource name is invalid.",
        "Use a valid DNS resource name."
      );
    result.push(...validateLabels(metadata.labels, `${path}/metadata/labels`));
    if (
      metadata.namespace !== undefined &&
      (typeof metadata.namespace !== "string" || !dnsLabel(metadata.namespace))
    )
      add(
        "NAMESPACE_INVALID",
        `${path}/metadata/namespace`,
        "The Kubernetes namespace must be a DNS label.",
        "Choose a valid namespace."
      );
    if (
      resource.spec?.replicas !== undefined &&
      (!Number.isInteger(resource.spec.replicas) || resource.spec.replicas < 0)
    )
      add(
        "REPLICAS_INVALID",
        `${path}/spec/replicas`,
        "Replicas must be a nonnegative integer.",
        "Correct the replica count."
      );
    if (resource.kind === "PersistentVolumeClaim") {
      const spec = resource.spec ?? {};
      if (
        !Array.isArray(spec.accessModes) ||
        !spec.accessModes.length ||
        spec.accessModes.some(
          (mode: string) =>
            ![
              "ReadWriteOnce",
              "ReadWriteMany",
              "ReadOnlyMany",
              "ReadWriteOncePod"
            ].includes(mode)
        )
      )
        add(
          "STORAGE_ACCESS_MODE",
          `${path}/spec/accessModes`,
          "Choose valid claim access modes.",
          "Set the storage access mode explicitly."
        );
      if (!(quantity(spec.resources?.requests?.storage)! > 0))
        add(
          "STORAGE_SIZE",
          `${path}/spec/resources/requests/storage`,
          "Claim storage must be a positive Kubernetes quantity.",
          "Set a storage size such as 5Gi."
        );
      if (
        spec.storageClassName !== undefined &&
        spec.storageClassName !== "" &&
        !dnsSubdomain(spec.storageClassName)
      )
        add(
          "STORAGE_CLASS",
          `${path}/spec/storageClassName`,
          "The storage class name is invalid.",
          "Use the actual StorageClass resource name."
        );
      const referenced = documents.some(
        (document) =>
          (document.metadata?.namespace || "default") ===
            (metadata.namespace || "default") &&
          (document.kind === "Pod"
            ? document.spec?.volumes
            : document.kind === "CronJob"
              ? document.spec?.jobTemplate?.spec?.template?.spec?.volumes
              : document.spec?.template?.spec?.volumes
          )?.some(
            (volume: any) =>
              volume.persistentVolumeClaim?.claimName === metadata.name
          )
      );
      if (!referenced)
        add(
          "STORAGE_RETAINED",
          path,
          "This claim is retained without a consuming workload in this export.",
          "Review retained storage explicitly; deleting a graph workload does not delete its claim.",
          "warning"
        );
    }
    const template =
      resource.kind === "Pod"
        ? resource
        : resource.kind === "CronJob"
          ? resource.spec?.jobTemplate?.spec?.template
          : resource.spec?.template;
    if (template?.spec) {
      if (
        !Array.isArray(template.spec.containers) ||
        !template.spec.containers.length
      )
        add(
          "CONTAINERS_REQUIRED",
          `${path}/spec/containers`,
          "A Pod needs at least one application container.",
          "Add a container before exporting."
        );
      result.push(
        ...validateLabels(
          template.metadata?.labels,
          `${path}/spec/template/metadata/labels`
        )
      );
      const match = resource.spec?.selector?.matchLabels;
      if (
        match &&
        Object.entries(match).some(
          ([key, value]) => template.metadata?.labels?.[key] !== value
        )
      )
        add(
          "SELECTOR_MISMATCH",
          `${path}/spec/selector`,
          "The workload selector does not match its Pod labels.",
          "Use matching selector and Pod identity labels."
        );
      const volumes = new Set<string>();
      for (const [volumeIndex, volume] of (
        template.spec.volumes ?? []
      ).entries()) {
        if (!dnsLabel(volume.name) || volumes.has(volume.name))
          add(
            "VOLUME_NAME_INVALID",
            `${path}/spec/volumes/${volumeIndex}/name`,
            "Pod volume names must be distinct DNS labels.",
            "Choose a distinct volume name."
          );
        volumes.add(volume.name);
        if (Object.keys(volume).filter((key) => key !== "name").length !== 1)
          add(
            "VOLUME_SOURCE_INVALID",
            `${path}/spec/volumes/${volumeIndex}`,
            "A Pod volume must select exactly one storage source.",
            "Choose one volume source."
          );
        if (
          volume.persistentVolumeClaim &&
          !dnsSubdomain(volume.persistentVolumeClaim.claimName ?? "")
        )
          add(
            "CLAIM_NAME_INVALID",
            `${path}/spec/volumes/${volumeIndex}`,
            "The existing claim name is invalid.",
            "Supply the actual PVC name without normalizing it."
          );
      }
      const containers = new Set<string>();
      for (const [containerIndex, container] of [
        ...(template.spec.containers ?? []),
        ...(template.spec.initContainers ?? [])
      ].entries()) {
        const cp = `${path}/containers/${containerIndex}`;
        if (!dnsLabel(container.name) || containers.has(container.name))
          add(
            "CONTAINER_NAME_INVALID",
            `${cp}/name`,
            "Container names must be distinct DNS labels.",
            "Choose a distinct container name."
          );
        containers.add(container.name);
        for (const field of ["runAsUser", "runAsGroup"]) {
          const value = container.securityContext?.[field];
          if (
            value !== undefined &&
            (!Number.isSafeInteger(value) || value < 0)
          )
            add(
              "SECURITY_ID_INVALID",
              `${cp}/securityContext/${field}`,
              "Numeric process identities must be nonnegative safe integers.",
              "Supply a valid numeric process identity."
            );
        }
        for (const [kind, values] of Object.entries(
          container.resources ?? {}
        )) {
          if (!["limits", "requests"].includes(kind)) continue;
          for (const [resource, amount] of Object.entries(values as object)) {
            const number = quantity(amount);
            if (
              resource === "cpu" &&
              number !== undefined &&
              number !== 0 &&
              (number < 0.001 ||
                Math.abs(number * 1000 - Math.round(number * 1000)) > 1e-7)
            )
              add(
                "RESOURCE_PRECISION",
                `${cp}/resources/${kind}/cpu`,
                "CPU precision must be at least one millicore.",
                "Use a whole number of millicores."
              );
            if (number === undefined || number < 0)
              add(
                "RESOURCE_QUANTITY",
                `${cp}/resources/${kind}/${pointer(resource)}`,
                "The resource quantity is invalid.",
                "Use a nonnegative Kubernetes resource quantity."
              );
            if (
              kind === "requests" &&
              container.resources?.limits?.[resource] !== undefined &&
              number !== undefined &&
              number >
                (quantity(container.resources.limits[resource]) ?? Infinity)
            )
              add(
                "RESOURCE_REQUEST_EXCEEDS_LIMIT",
                `${cp}/resources/requests/${pointer(resource)}`,
                "The resource request exceeds its limit.",
                "Lower the request or increase the limit."
              );
          }
        }
        const names = new Set<string>(),
          ports = new Set<string>();
        for (const port of container.ports ?? []) {
          if (
            !Number.isInteger(port.containerPort) ||
            port.containerPort < 1 ||
            port.containerPort > 65535
          )
            add(
              "PORT_INVALID",
              `${cp}/ports`,
              "Container ports must be integers from 1 to 65535.",
              "Correct the container port."
            );
          if (
            port.name &&
            (port.name.length > 15 ||
              !dnsLabel(port.name) ||
              !/[a-z]/.test(port.name) ||
              names.has(port.name))
          )
            add(
              "PORT_NAME_INVALID",
              `${cp}/ports`,
              "Port names must be distinct, valid IANA service names.",
              "Use unique port names of at most 15 characters."
            );
          if (port.name) names.add(port.name);
          ports.add(`${port.containerPort}/${port.protocol ?? "TCP"}`);
        }
        const paths = new Set<string>();
        for (const mount of container.volumeMounts ?? []) {
          if (!volumes.has(mount.name))
            add(
              "REFERENCE_MISSING",
              `${cp}/volumeMounts`,
              "A mount refers to a missing Pod volume.",
              "Add the volume or repair the mount reference."
            );
          if (
            !absoluteContainerPath(mount.mountPath) ||
            paths.has(mount.mountPath)
          )
            add(
              "MOUNT_TARGET_INVALID",
              `${cp}/volumeMounts`,
              "Mount destinations must be absolute and distinct.",
              "Correct the mount destination."
            );
          paths.add(mount.mountPath);
        }
        for (const probeName of [
          "livenessProbe",
          "readinessProbe",
          "startupProbe"
        ])
          if (container[probeName]) {
            const probe = container[probeName];
            if (
              ["exec", "httpGet", "tcpSocket", "grpc"].filter(
                (key) => probe[key]
              ).length !== 1
            )
              add(
                "PROBE_INVALID",
                `${cp}/${probeName}`,
                "A probe must have exactly one handler.",
                "Choose one probe handler."
              );
            const port = probe.httpGet?.port ?? probe.tcpSocket?.port;
            if (typeof port === "string" && !names.has(port))
              add(
                "REFERENCE_MISSING",
                `${cp}/${probeName}`,
                "The probe names a missing container port.",
                "Repair the probe port reference."
              );
          }
      }
      if (
        ["Deployment", "StatefulSet", "DaemonSet", "ReplicaSet"].includes(
          resource.kind
        ) &&
        template.spec.restartPolicy &&
        template.spec.restartPolicy !== "Always"
      )
        add(
          "RESTART_INVALID",
          `${path}/spec/template/spec/restartPolicy`,
          "This controller requires restartPolicy Always.",
          "Choose a compatible controller or restart policy."
        );
      if (
        ["Job", "CronJob"].includes(resource.kind) &&
        !["Never", "OnFailure"].includes(template.spec.restartPolicy)
      )
        add(
          "RESTART_INVALID",
          `${path}/spec/template/spec/restartPolicy`,
          "Jobs require an explicit Never or OnFailure restart policy.",
          "Choose a valid Job restart policy."
        );
    }
    if (resource.kind === "Service") {
      const spec = resource.spec ?? {};
      const type = spec.type ?? "ClusterIP";
      if (
        !["ClusterIP", "NodePort", "LoadBalancer", "ExternalName"].includes(
          type
        )
      )
        add(
          "SERVICE_TYPE_INVALID",
          `${path}/spec/type`,
          "This is not a Kubernetes Service type.",
          "Choose ClusterIP, NodePort, LoadBalancer or ExternalName in the native manifest."
        );
      if (
        type !== "ExternalName" &&
        !(spec.clusterIP === "None" && !spec.ports?.length)
      ) {
        const settings = {
          type,
          ports: (spec.ports ?? []).map((port: any) => ({
            ...port,
            targetPort: port.targetPort ?? port.port,
            protocol: port.protocol ?? "TCP"
          }))
        };
        for (const issue of serviceExposureIssues(settings))
          add(
            issue.code,
            `${path}/spec${issue.path}`,
            issue.reason,
            "Correct the Service exposure settings."
          );
      }
      for (const [portIndex, port] of (spec.ports ?? []).entries()) {
        if (port.nodePort) {
          const key = `${port.nodePort}/${port.protocol ?? "TCP"}`;
          if (allocatedNodePorts.has(key))
            add(
              "NODE_PORT_CONFLICT",
              `${path}/spec/ports/${portIndex}/nodePort`,
              "This node port/protocol is already requested by another Service in this export.",
              "Choose a distinct node port or allow automatic allocation."
            );
          else allocatedNodePorts.set(key, path);
        }
      }
      if (Object.keys(resource.spec?.selector ?? {}).length) {
        const selected = documents.filter(
          (document) =>
            workloadTemplate(document) && selectsWorkload(resource, document)
        );
        for (const [portIndex, port] of (spec.ports ?? []).entries()) {
          if (typeof port.targetPort !== "string") continue;
          for (const workload of selected) {
            const matches = (
              workloadTemplate(workload)?.spec?.containers ?? []
            ).some((container: any) =>
              (container.ports ?? []).some(
                (entry: any) =>
                  entry.name === port.targetPort &&
                  (entry.protocol ?? "TCP") === (port.protocol ?? "TCP")
              )
            );
            if (!matches)
              add(
                "SERVICE_TARGET_MISSING",
                `${path}/spec/ports/${portIndex}/targetPort`,
                "A selected workload does not declare this named target with the same protocol.",
                "Correct the target name or declare the corresponding container port."
              );
          }
        }
        if (!selected.length)
          add(
            "SERVICE_NO_LOCAL_WORKLOAD",
            `${path}/spec/selector`,
            "This Service does not select a workload in this export.",
            "Verify the selector or supply the separately managed workload.",
            "warning"
          );
      }
    }
  }
  return result;
}
