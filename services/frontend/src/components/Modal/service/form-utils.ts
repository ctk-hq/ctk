import type { IEditServiceForm, IServiceNodeItem } from "../../../types";
import * as yup from "yup";
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
} from "../../../utils/forms";

export const tabs = [
  {
    name: "General",
    href: "#",
    current: true,
    hidden: false
  },
  {
    name: "Environment",
    href: "#",
    current: false,
    hidden: false
  },
  {
    name: "Data",
    href: "#",
    current: false,
    hidden: false
  },
  {
    name: "Build",
    href: "#",
    current: false,
    hidden: false
  },
  {
    name: "Deploy",
    href: "#",
    current: false,
    hidden: false
  }
];

const initialValues: IEditServiceForm = {
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
  command: "",
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
  entrypoint: "",
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
    | boolean
    | yup.ValidationError {
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

export const validationSchema = yup.object({
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
        pids: yup.string()
      }),
      reservations: yup.object({
        cpus: yup.string(),
        memory: yup.string()
      })
    }),
    restartPolicy: yup.object({
      condition: yup.string().oneOf(["", "none", "on-failure", "any"]),
      delay: yup.string(),
      maxAttempts: yup.string(),
      window: yup.string()
    }),
    rollbackConfig: yup.object({
      parallelism: yup.string(),
      delay: yup.string(),
      failureAction: yup.string().oneOf(["", "continue", "pause"]),
      monitor: yup.string(),
      maxFailureRatio: yup.string(),
      order: yup.string().oneOf(["", "stop-first", "start-first"])
    }),
    updateConfig: yup.object({
      parallelism: yup.string(),
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
    .max(256, "Image name should be 256 characters or less")
    .required("Image name is required"),
  imageTag: yup.string().max(256, "Image tag should be 256 characters or less"),
  containerName: yup
    .string()
    .max(256, "Container name should be 256 characters or less")
    .required("Container name is required"),
  profiles: yup.array(
    yup
      .string()
      .max(256, "Name should be 256 characters or less")
      .required("Name is required")
  ),
  ports: yup.array(
    yup.object({
      hostPort: (yup.string().required("Host port is required") as any).port(
        "Host port should be an integer in the range 0-65535"
      ),
      containerPort: (yup.string() as any).port(
        "Container port should be an integer in the range 0-65535"
      ),
      protocol: yup
        .string()
        .oneOf(["tcp", "udp"], "Protocol should be tcp or udp")
    })
  ),
  environmentVariables: yup.array(
    yup.object({
      key: yup.string().required("Key is required")
    })
  ),
  volumes: yup.array(
    yup.object({
      name: yup.string().required("Name is required"),
      containerPath: yup.string(),
      accessMode: yup.string()
    })
  ),
  labels: yup.array(
    yup.object({
      key: yup.string().required("Key is required"),
      value: yup.string()
    })
  )
});

export const getInitialValues = (node?: IServiceNodeItem): IEditServiceForm => {
  if (!node) {
    return {
      ...initialValues
    };
  }

  const { canvasConfig, serviceConfig } = node;
  const { node_name = "" } = canvasConfig;
  const {
    build,
    command,
    deploy,
    depends_on,
    entrypoint,
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

  const volumes0: string[] = checkArray(volumes ?? [], "volumes");
  const ports0: string[] = checkArray(ports ?? [], "ports");
  const [imageName, imageTag] = (image ?? ":").split(":");

  return {
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
    command: (command as string) ?? (initialValues.command as string),
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
                  extractObjectOrArray(
                    "=",
                    "key",
                    "value",
                    deploy.placement.preferences
                  ) ?? initialValues.deploy.placement.preferences
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
    dependsOn:
      (depends_on as string[]) ?? (initialValues.dependsOn as string[]),
    entrypoint: (entrypoint as string) ?? (initialValues.entrypoint as string),
    imageName,
    imageTag,
    serviceName: node_name,
    containerName: container_name,
    environmentVariables:
      extractObjectOrArray("=", "key", "value", environment) ??
      initialValues.environmentVariables,
    volumes: volumes0.map((volume) => {
      const [name, containerPath, accessMode] = volume.split(":");
      return {
        name,
        containerPath,
        accessMode
      };
    }),
    networks: (networks as string[]) ?? (initialValues.networks as string[]),
    ports: ports0.map((port) => {
      const slashIndex = port.lastIndexOf("/");
      const protocol = slashIndex >= 0 ? port.substring(slashIndex + 1) : "";
      const [hostPort, containerPort] = port
        .substring(0, slashIndex)
        .split(":");

      if (!["", "tcp", "udp"].includes(protocol)) {
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

export const getFinalValues = (
  values: IEditServiceForm,
  previous?: IServiceNodeItem
): IServiceNodeItem => {
  const {
    build,
    command,
    deploy,
    dependsOn,
    entrypoint,
    environmentVariables,
    volumes,
    networks,
    ports,
    profiles,
    restart,
    labels,
    workingDir
  } = values;

  return {
    key: previous?.key ?? "service",
    type: "SERVICE",
    position: previous?.position ?? { left: 0, top: 0 },
    inputs: previous?.inputs ?? ["op_source"],
    outputs: previous?.outputs ?? [],
    canvasConfig: {
      node_name: values.serviceName
    },
    serviceConfig: {
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
      command: pruneString(command),
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
          preferences: packArrayAsStrings(
            deploy.placement.preferences,
            "key",
            "value",
            "="
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
          // NOTE: Could be a potential bug.
          maxAttempts: pruneNumber(parseInt(deploy.restartPolicy.maxAttempts)),
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
      depends_on: pruneArray(dependsOn),
      entrypoint: pruneString(entrypoint),
      image: `${values.imageName}${
        values.imageTag ? `:${values.imageTag}` : ""
      }`,
      container_name: values.containerName,
      environment: packArrayAsObject(environmentVariables, "key", "value"),
      volumes: pruneArray(
        volumes.map(
          (volume) =>
            volume.name +
            (volume.containerPath ? `:${volume.containerPath}` : "") +
            (volume.accessMode ? `:${volume.accessMode}` : "")
        )
      ),
      networks: pruneArray(networks),
      ports: pruneArray(
        ports.map(
          (port) =>
            port.hostPort +
            (port.containerPort ? `:${port.containerPort}` : "") +
            (port.protocol ? `/${port.protocol}` : "")
        )
      ),
      profiles: pruneArray(profiles),
      restart: pruneString(restart),
      labels: packArrayAsObject(labels, "key", "value"),
      working_dir: pruneString(workingDir)
    }
  };
};
