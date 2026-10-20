import type {
  IEditServiceForm,
  IEditServiceFormDependsOn,
  IServiceNodeItem
} from "../../../../types";
import * as yup from "yup";
import { commandArguments, commandFormValue } from "../../../../utils/commands";
import {
  checkArray,
  pruneArray,
  pruneObject,
  extractObjectOrArray,
  extractArray,
  pruneString,
  pruneNumber,
  packArrayAsObject,
  packArrayAsStrings
} from "../../../../utils/forms";
import General from "./General";
import Environment from "./Environment";
import Data from "./Data";
import Build from "./Build";
import Deploy from "./Deploy";

export const tabs = [
  {
    value: "general",
    title: "General",
    component: General
  },
  {
    value: "environment",
    title: "Environment",
    component: Environment
  },
  {
    value: "data",
    title: "Data",
    component: Data
  },
  {
    value: "build",
    title: "Build",
    component: Build
  },
  {
    value: "deploy",
    title: "Deploy",
    component: Deploy
  }
];

const initialValues: IEditServiceForm = {
  capAdd: [],
  capDrop: [],
  build: {
    context: "",
    dockerfile: "",
    arguments: [],
    sshAuthentications: [],
    cacheFrom: [],
    cacheTo: [],
    extraHosts: [],
    isolation: "",
    labels: [],
    sharedMemorySize: "",
    target: ""
  },
  command: null,
  deploy: {
    mode: "",
    replicas: "",
    endpointMode: "",
    placement: {
      constraints: [],
      preferences: []
    },
    resources: {
      limits: {
        cpus: "",
        memory: "",
        pids: ""
      },
      reservations: {
        cpus: "",
        memory: ""
      }
    },
    restartPolicy: {
      condition: "",
      delay: "",
      maxAttempts: "",
      window: ""
    },
    rollbackConfig: {
      parallelism: "",
      delay: "",
      failureAction: "",
      monitor: "",
      maxFailureRatio: "",
      order: ""
    },
    updateConfig: {
      parallelism: "",
      delay: "",
      failureAction: "",
      monitor: "",
      maxFailureRatio: "",
      order: ""
    },
    labels: []
  },
  dependsOn: [],
  entrypoint: null,
  envFile: "",
  imageName: "",
  imageTag: "",
  serviceName: "",
  containerName: "",
  networks: [],
  profiles: [],
  ports: [],
  environmentVariables: [],
  volumes: [],
  restart: "",
  labels: [],
  workingDir: ""
};

yup.addMethod<yup.StringSchema>(yup.string, "port", function (message) {
  return this.test("test-port", message, function (value):
    boolean | yup.ValidationError {
    const { path, createError } = this;

    if (value) {
      const result = parseInt(value, 10);
      if (isNaN(result) || result < 0 || result > 65535) {
        return createError({ path, message });
      }
    }

    return true;
  });
});

const normalizeCapability = (value: string): string =>
  value.trim().toUpperCase().replace(/^CAP_/, "");

const capabilitySchema = yup
  .string()
  .transform(normalizeCapability)
  .matches(/^[A-Z][A-Z0-9_]*$/, {
    message: "Use a capability name such as NET_ADMIN",
    excludeEmptyString: true
  })
  .required("Capability name is required");

const commandSchema = yup
  .mixed()
  .nullable()
  .test("command", function (value) {
    try {
      // Formik normalizes blank argument strings to undefined for validation only.
      commandArguments(
        Array.isArray(value)
          ? value.map((arg) => (arg === undefined ? "" : arg))
          : value
      );
      return true;
    } catch (error) {
      return this.createError({ message: (error as Error).message });
    }
  });

export const validationSchema = yup.object({
  capAdd: yup.array(capabilitySchema),
  capDrop: yup.array(capabilitySchema),
  command: commandSchema,
  entrypoint: commandSchema,
  build: yup.object({
    /* TODO: The `context` attribute is required, only when `build` is defined. */
    context: yup.string() /* .required("Context is required") */,
    dockerfile: yup.string(),
    arguments: yup.array(
      yup.object({
        key: yup.string().required("Key is required"),
        value: yup.string()
      })
    ),
    sshAuthentications: yup.array(
      yup.object({
        id: yup.string().required("ID is required"),
        path: yup.string()
      })
    ),
    cacheFrom: yup.array(yup.string()),
    cacheTo: yup.array(yup.string()),
    extraHosts: yup.array(
      yup.object({
        hostName: yup.string().required(),
        ipAddress: yup.string().required()
      })
    ),
    isolation: yup.string(),
    labels: yup.array(
      yup.object({
        key: yup.string().required("Key is required"),
        value: yup.string()
      })
    ),
    // TODO: <integer><unit>?
    sharedMemorySize: yup.string(),
    target: yup.string()
  }),
  deploy: yup.object({
    mode: yup.string().oneOf(["", "global", "replicated"]),
    endpointMode: yup.string().oneOf(["", "vip", "dnsrr"]),
    replicas: yup.string(),
    placement: yup.object({
      constraints: yup.array(
        yup.object({
          key: yup.string().required("Key is required"),
          value: yup.string().required("Value is required")
        })
      ),
      preferences: yup.array(
        yup.object({
          key: yup.string().required("Key is required"),
          value: yup.string().required("Value is required")
        })
      )
    }),
    resources: yup.object({
      limits: yup.object({
        cpus: yup.string(),
        memory: yup.string(),
        pids: yup.number().typeError("PIDs should be an integer")
      }),
      reservations: yup.object({
        cpus: yup.string(),
        memory: yup.string()
      })
    }),
    restartPolicy: yup.object({
      condition: yup.string().oneOf(["", "none", "on-failure", "any"]),
      delay: yup.string(),
      maxAttempts: yup.number().typeError("max attempts should be an integer"),
      window: yup.string()
    }),
    rollbackConfig: yup.object({
      parallelism: yup.number().typeError("parallelism should be an integer"),
      delay: yup.string(),
      failureAction: yup.string().oneOf(["", "continue", "pause"]),
      monitor: yup.string(),
      maxFailureRatio: yup.string(),
      order: yup.string().oneOf(["", "stop-first", "start-first"])
    }),
    updateConfig: yup.object({
      parallelism: yup.number().typeError("parallelism should be an integer"),
      delay: yup.string(),
      failureAction: yup.string().oneOf(["", "continue", "pause"]),
      monitor: yup.string(),
      maxFailureRatio: yup.string(),
      order: yup.string().oneOf(["", "stop-first", "start-first"])
    }),
    labels: yup.array(
      yup.object({
        key: yup.string().required("Key is required"),
        value: yup.string()
      })
    )
  }),
  serviceName: yup
    .string()
    .max(256, "Service name should be 256 characters or less")
    .required("Service name is required"),
  imageName: yup
    .string()
    .max(256, "Image name should be 256 characters or less"),
  imageTag: yup.string().max(256, "Image tag should be 256 characters or less"),
  containerName: yup
    .string()
    .max(256, "Container name should be 256 characters or less"),
  profiles: yup.array(
    yup
      .string()
      .max(256, "Name should be 256 characters or less")
      .required("Name is required")
  ),
  ports: yup.array(
    yup.object({
      hostPort: (yup.string() as any).port(
        "Host port should be an integer in the range 0-65535"
      ),
      containerPort: (yup.string() as any).port(
        "Container port should be an integer in the range 0-65535"
      ),
      protocol: yup
        .string()
        .oneOf(
          ["", "tcp", "udp", "sctp"],
          "Protocol should be tcp, udp, or sctp"
        )
    })
  ),
  environmentVariables: yup.array(
    yup.object({
      key: yup.string().required("Key is required")
    })
  ),
  volumes: yup.array(
    yup.object({
      name: yup.string().when("containerPath", {
        is: (value: string) => !value,
        then: (schema) => schema.required("Name or container path is required")
      }),
      containerPath: yup.string(),
      accessMode: yup.string()
    })
  ),
  labels: yup.array(
    yup.object({
      key: yup.string().required("Key is required"),
      value: yup.string()
    })
  ),
  dependsOn: yup.array(
    yup.object({
      serviceName: yup.string().required("Service name is required"),
      condition: yup
        .string()
        .oneOf(
          [
            "service_started",
            "service_healthy",
            "service_completed_successfully"
          ],
          "Condition should be one of: service_started, service_healthy, or service_completed_successfully."
        )
    })
  ),
  workingDir: yup.string()
});

const extractDependsOn = (object: string[] | any) => {
  if (!object) {
    return object;
  }

  if (Array.isArray(object)) {
    return object.map((item) => ({
      serviceName: item,
      condition: "service_started"
    }));
  }

  return Object.keys(object).map((key) => ({
    serviceName: key,
    condition: object[key].condition
  }));
};

export const getInitialValues = (node?: IServiceNodeItem): IEditServiceForm => {
  if (!node) {
    return {
      ...initialValues
    };
  }

  const { canvasConfig, serviceConfig } = node;
  const { node_name = "" } = canvasConfig;
  const {
    cap_add,
    cap_drop,
    build,
    command,
    deploy,
    depends_on,
    entrypoint,
    env_file,
    image,
    container_name = "",
    environment,
    volumes,
    networks,
    ports,
    profiles,
    restart,
    labels,
    working_dir
  } = serviceConfig;

  const volumes0: any[] = checkArray(volumes ?? [], "volumes");
  const ports0: any[] = checkArray(ports ?? [], "ports");
  const imageReference = image ?? "";
  const tagSeparator = imageReference.lastIndexOf(":");
  const hasTag =
    !imageReference.includes("@") &&
    tagSeparator > imageReference.lastIndexOf("/");
  const imageName = hasTag
    ? imageReference.slice(0, tagSeparator)
    : imageReference;
  const imageTag = hasTag ? imageReference.slice(tagSeparator + 1) : "";

  return {
    capAdd: [...(cap_add ?? initialValues.capAdd)],
    capDrop: [...(cap_drop ?? initialValues.capDrop)],
    build: build
      ? {
          context: build.context,
          dockerfile: build.dockerfile ?? initialValues.build.dockerfile,
          arguments:
            extractObjectOrArray("=", "key", "value", build.args) ??
            initialValues.build.arguments,
          sshAuthentications:
            extractArray("=", "id", "path", build.ssh) ??
            initialValues.build.sshAuthentications,
          cacheFrom: build.cache_from ?? initialValues.build.cacheFrom,
          cacheTo: build.cache_to ?? initialValues.build.cacheTo,
          extraHosts:
            extractArray(":", "hostName", "ipAddress", build.extra_hosts) ??
            initialValues.build.extraHosts,
          isolation: build.isolation ?? initialValues.build.isolation,
          labels:
            extractObjectOrArray("=", "key", "value", build.labels) ??
            initialValues.build.labels,
          sharedMemorySize:
            build.shm_size?.toString() ?? initialValues.build.sharedMemorySize,
          target: build.target?.toString() ?? initialValues.build.target
        }
      : initialValues.build,
    command: commandFormValue(command),
    deploy: deploy
      ? {
          mode: deploy.mode ?? initialValues.deploy.mode,
          endpointMode:
            deploy.endpoint_mode ?? initialValues.deploy.endpointMode,
          replicas:
            deploy.replicas?.toString() ?? initialValues.deploy.replicas,
          placement: deploy.placement
            ? {
                constraints:
                  extractObjectOrArray(
                    "=",
                    "key",
                    "value",
                    deploy.placement.constraints
                  ) ?? initialValues.deploy.placement.constraints,
                preferences:
                  (Array.isArray(deploy.placement.preferences)
                    ? deploy.placement.preferences.flatMap((preference) =>
                        extractObjectOrArray(
                          "=",
                          "key",
                          "value",
                          typeof preference === "string"
                            ? [preference]
                            : preference
                        )
                      )
                    : extractObjectOrArray(
                        "=",
                        "key",
                        "value",
                        deploy.placement.preferences
                      )) ?? initialValues.deploy.placement.preferences
              }
            : initialValues.deploy.placement,
          resources: deploy.resources
            ? {
                limits: deploy.resources.limits
                  ? {
                      cpus:
                        deploy.resources.limits.cpus ??
                        initialValues.deploy.resources.limits.cpus,
                      memory:
                        deploy.resources.limits.memory ??
                        initialValues.deploy.resources.limits.memory,
                      pids:
                        deploy.resources.limits.pids?.toString() ??
                        initialValues.deploy.resources.limits.pids
                    }
                  : initialValues.deploy.resources.limits,
                reservations: deploy.resources.reservations
                  ? {
                      cpus:
                        deploy.resources.reservations.cpus ??
                        initialValues.deploy.resources.reservations.cpus,
                      memory:
                        deploy.resources.reservations.memory ??
                        initialValues.deploy.resources.reservations.memory
                    }
                  : initialValues.deploy.resources.reservations
              }
            : initialValues.deploy.resources,
          restartPolicy: deploy.restart_policy
            ? {
                condition:
                  deploy.restart_policy.condition ??
                  initialValues.deploy.restartPolicy.condition,
                delay:
                  deploy.restart_policy.delay ??
                  initialValues.deploy.restartPolicy.delay,
                maxAttempts:
                  deploy.restart_policy.max_attempts?.toString() ??
                  initialValues.deploy.restartPolicy.maxAttempts,
                window:
                  deploy.restart_policy.window ??
                  initialValues.deploy.restartPolicy.window
              }
            : initialValues.deploy.restartPolicy,
          rollbackConfig: deploy.rollback_config
            ? {
                parallelism:
                  deploy.rollback_config.parallelism?.toString() ??
                  initialValues.deploy.rollbackConfig.parallelism,
                delay:
                  deploy.rollback_config.delay ??
                  initialValues.deploy.rollbackConfig.delay,
                failureAction:
                  deploy.rollback_config.failure_action ??
                  initialValues.deploy.rollbackConfig.failureAction,
                monitor:
                  deploy.rollback_config.monitor ??
                  initialValues.deploy.rollbackConfig.monitor,
                maxFailureRatio:
                  deploy.rollback_config.max_failure_ratio ??
                  initialValues.deploy.rollbackConfig.maxFailureRatio,
                order:
                  deploy.rollback_config.order ??
                  initialValues.deploy.rollbackConfig.order
              }
            : initialValues.deploy.rollbackConfig,
          updateConfig: deploy.update_config
            ? {
                parallelism:
                  deploy.update_config.parallelism?.toString() ??
                  initialValues.deploy.updateConfig.parallelism,
                delay:
                  deploy.update_config.delay ??
                  initialValues.deploy.updateConfig.delay,
                failureAction:
                  deploy.update_config.failure_action ??
                  initialValues.deploy.updateConfig.failureAction,
                monitor:
                  deploy.update_config.monitor ??
                  initialValues.deploy.updateConfig.monitor,
                maxFailureRatio:
                  deploy.update_config.max_failure_ratio ??
                  initialValues.deploy.updateConfig.maxFailureRatio,
                order:
                  deploy.update_config.order ??
                  initialValues.deploy.updateConfig.order
              }
            : initialValues.deploy.updateConfig,
          labels:
            extractObjectOrArray("=", "key", "value", deploy.labels) ??
            initialValues.deploy.labels
        }
      : initialValues.deploy,
    dependsOn: extractDependsOn(depends_on) ?? initialValues.dependsOn,
    entrypoint: commandFormValue(entrypoint),
    envFile: (env_file as string) ?? (initialValues.envFile as string),
    imageName,
    imageTag,
    serviceName: node_name,
    containerName: container_name,
    environmentVariables:
      extractObjectOrArray("=", "key", "value", environment) ??
      initialValues.environmentVariables,
    volumes: volumes0.map((volume) => {
      if (typeof volume !== "string")
        return {
          name: volume.source ?? "",
          containerPath: volume.target ?? "",
          accessMode: volume.read_only ? "ro" : ""
        };
      if (!volume.includes(":"))
        return { name: "", containerPath: volume, accessMode: "" };
      const [name, containerPath, accessMode] = volume.split(":");
      return {
        name,
        containerPath,
        accessMode
      };
    }),
    networks: Array.isArray(networks)
      ? networks
      : networks
        ? Object.keys(networks)
        : initialValues.networks,
    ports: ports0.map((port) => {
      if (typeof port !== "string") {
        if (typeof port === "number")
          return { hostPort: "", containerPort: String(port), protocol: "" };
        return {
          hostPort: port.published === undefined ? "" : String(port.published),
          containerPort: String(port.target ?? ""),
          protocol: port.protocol ?? ""
        };
      }
      const slashIndex = port.lastIndexOf("/");
      const protocol = slashIndex >= 0 ? port.substring(slashIndex + 1) : "";
      const parts = (
        slashIndex >= 0 ? port.substring(0, slashIndex) : port
      ).split(":");
      const containerPort = parts.at(-1) ?? "";
      const hostPort = parts.length > 1 ? (parts.at(-2) ?? "") : "";

      if (!["", "tcp", "udp", "sctp"].includes(protocol)) {
        throw new Error(
          `Invalid protocol "${protocol}" found while deserializing.`
        );
      }

      return { hostPort, containerPort, protocol } as any;
    }),
    profiles: profiles ?? initialValues.profiles,
    restart: (restart as string) ?? (initialValues.restart as string),
    labels:
      extractObjectOrArray("=", "key", "value", labels) ?? initialValues.labels,
    workingDir: (working_dir as string) ?? (initialValues.workingDir as string)
  };
};

const getFinalDependsOn = (dependsOn: IEditServiceFormDependsOn[]) => {
  let shortForm = true;
  for (const item of dependsOn) {
    if (item.condition !== "service_started") {
      shortForm = false;
      break;
    }
  }

  if (shortForm) {
    return pruneArray(dependsOn.map((item) => item.serviceName));
  }

  return pruneObject(
    Object.fromEntries(
      dependsOn.map((item) => [
        item.serviceName,
        {
          condition: item.condition
        }
      ])
    )
  );
};

export const getFinalValues = (
  values: IEditServiceForm,
  previous?: IServiceNodeItem
): IServiceNodeItem => {
  const {
    capAdd,
    capDrop,
    build,
    command,
    deploy,
    dependsOn,
    entrypoint,
    envFile,
    environmentVariables,
    volumes,
    networks,
    ports,
    profiles,
    restart,
    labels,
    workingDir
  } = values;

  const result: IServiceNodeItem = {
    key: previous?.key ?? "service",
    type: "SERVICE",
    position: previous?.position ?? { left: 0, top: 0 },
    inputs: previous?.inputs ?? ["op_source"],
    outputs: previous?.outputs ?? [],
    canvasConfig: {
      ...previous?.canvasConfig,
      node_name: values.serviceName
    },
    serviceConfig: {
      cap_add: pruneArray([...new Set(capAdd.map(normalizeCapability))]),
      cap_drop: pruneArray([...new Set(capDrop.map(normalizeCapability))]),
      build: pruneObject({
        context: pruneString(build.context),
        dockerfile: pruneString(build.dockerfile),
        args: packArrayAsObject(build.arguments, "key", "value"),
        ssh: packArrayAsStrings(build.sshAuthentications, "id", "path", "="),
        cache_from: pruneArray(build.cacheFrom),
        cache_to: pruneArray(build.cacheTo),
        extra_hosts: packArrayAsStrings(
          build.extraHosts,
          "hostName",
          "ipAddress",
          ":"
        ),
        isolation: pruneString(build.isolation),
        labels: packArrayAsObject(build.labels, "key", "value"),
        // NOTE: This could be a potential bug for "0".
        shm_size: pruneString(build.sharedMemorySize),
        target: pruneString(build.target)
      }),
      command: command === null ? undefined : commandFormValue(command),
      deploy: pruneObject({
        mode: pruneString(deploy.mode),
        replicas: pruneString(deploy.replicas),
        endpoint_mode: pruneString(deploy.endpointMode),
        placement: pruneObject({
          constraints: packArrayAsStrings(
            deploy.placement.constraints,
            "key",
            "value",
            "="
          ),
          preferences: pruneArray(
            deploy.placement.preferences.map(({ key, value }) => ({
              [key]: value
            }))
          )
        }),
        resources: pruneObject({
          limits: pruneObject({
            cpus: pruneString(deploy.resources.limits.cpus),
            memory: pruneString(deploy.resources.limits.memory),
            // NOTE: Could be a potential bug.
            pids: pruneNumber(parseInt(deploy.resources.limits.pids))
          }),
          reservations: pruneObject({
            cpus: pruneString(deploy.resources.reservations.cpus),
            memory: pruneString(deploy.resources.reservations.memory)
          })
        }),
        restart_policy: pruneObject({
          condition: pruneString(deploy.restartPolicy.condition),
          delay: pruneString(deploy.restartPolicy.delay),
          max_attempts: pruneNumber(parseInt(deploy.restartPolicy.maxAttempts)),
          window: pruneString(deploy.restartPolicy.window)
        }),
        rollback_config: pruneObject({
          parallelism: pruneNumber(parseInt(deploy.rollbackConfig.parallelism)),
          delay: pruneString(deploy.rollbackConfig.delay),
          failure_action: pruneString(deploy.rollbackConfig.failureAction),
          monitor: pruneString(deploy.rollbackConfig.monitor),
          max_failure_ratio: pruneString(deploy.rollbackConfig.maxFailureRatio),
          order: pruneString(deploy.rollbackConfig.order)
        }),
        update_config: pruneObject({
          parallelism: pruneNumber(parseInt(deploy.updateConfig.parallelism)),
          delay: pruneString(deploy.updateConfig.delay),
          failure_action: pruneString(deploy.updateConfig.failureAction),
          monitor: pruneString(deploy.updateConfig.monitor),
          max_failure_ratio: pruneString(deploy.updateConfig.maxFailureRatio),
          order: pruneString(deploy.updateConfig.order)
        }),
        labels: packArrayAsObject(deploy.labels, "key", "value")
      }),
      depends_on: getFinalDependsOn(dependsOn),
      entrypoint:
        entrypoint === null ? undefined : commandFormValue(entrypoint),
      env_file: pruneString(envFile),
      image: pruneString(
        `${values.imageName}${values.imageTag ? `:${values.imageTag}` : ""}`
      ),
      container_name: pruneString(values.containerName),
      environment: packArrayAsObject(environmentVariables, "key", "value"),
      volumes: pruneArray(
        volumes.map(
          (volume) =>
            (volume.name
              ? volume.name +
                (volume.containerPath ? `:${volume.containerPath}` : "")
              : volume.containerPath) +
            (volume.accessMode ? `:${volume.accessMode}` : "")
        )
      ),
      networks: pruneArray(networks),
      ports: pruneArray(
        ports.map(
          (port) =>
            (port.hostPort
              ? port.hostPort +
                (port.containerPort ? `:${port.containerPort}` : "")
              : port.containerPort) + (port.protocol ? `/${port.protocol}` : "")
        )
      ),
      profiles: pruneArray(profiles),
      restart: pruneString(restart),
      labels: packArrayAsObject(labels, "key", "value"),
      working_dir: pruneString(workingDir)
    }
  };
  if (previous) {
    const baseline = getFinalValues(getInitialValues(previous)).serviceConfig;
    const edited = result.serviceConfig as Record<string, unknown>;
    const original = previous.serviceConfig as Record<string, unknown>;
    // Preserve raw syntax and fields the form does not edit. A changed field,
    // including an explicit deletion, still replaces its original value.
    result.serviceConfig = { ...original, ...edited };
    for (const key of Object.keys(edited)) {
      if (
        JSON.stringify(edited[key]) ===
        JSON.stringify((baseline as Record<string, unknown>)[key])
      ) {
        if (Object.hasOwn(original, key))
          (result.serviceConfig as Record<string, unknown>)[key] =
            original[key];
        else delete (result.serviceConfig as Record<string, unknown>)[key];
      }
    }
    // Older CTK projects used strings here; retain the existing migration.
    const originalPreferences =
      previous.serviceConfig.deploy?.placement?.preferences;
    if (
      Array.isArray(originalPreferences) &&
      originalPreferences.some(
        (preference: unknown) => typeof preference === "string"
      )
    ) {
      result.serviceConfig.deploy = {
        ...result.serviceConfig.deploy,
        placement: {
          ...result.serviceConfig.deploy?.placement,
          preferences: baseline.deploy?.placement?.preferences
        }
      };
    }
  }
  return result;
};
