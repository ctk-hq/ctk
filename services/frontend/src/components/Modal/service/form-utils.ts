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
    labels: []
  },
  imageName: "",
  imageTag: "",
  serviceName: "",
  containerName: "",
  profiles: [],
  ports: [],
  environmentVariables: [],
  volumes: [],
  labels: []
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
    deploy,
    image,
    container_name = "",
    environment,
    volumes,
    ports,
    profiles,
    labels
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
          labels:
            extractObjectOrArray("=", "key", "value", deploy.labels) ??
            initialValues.deploy.labels
        }
      : initialValues.deploy,
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
    labels:
      extractObjectOrArray("=", "key", "value", labels) ?? initialValues.labels
  };
};

export const getFinalValues = (
  values: IEditServiceForm,
  previous?: IServiceNodeItem
): IServiceNodeItem => {
  const {
    build,
    deploy,
    environmentVariables,
    ports,
    profiles,
    volumes,
    labels
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
        extra_hosts: pruneArray(
          build.extraHosts.map((extraHost) =>
            [extraHost.hostName, extraHost.ipAddress].join(":")
          )
        ),
        isolation: pruneString(build.isolation),
        labels: pruneObject(
          Object.fromEntries(
            build.labels.map((label) => [label.key, label.value])
          )
        ),
        // NOTE: This could be a potential bug for "0".
        shm_size: pruneString(build.sharedMemorySize),
        target: pruneString(build.target)
      }),
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
        labels: packArrayAsObject(deploy.labels, "key", "value")
      }),
      image: `${values.imageName}${
        values.imageTag ? `:${values.imageTag}` : ""
      }`,
      container_name: values.containerName,
      environment: pruneObject(
        Object.fromEntries(
          environmentVariables.map((environmentVariable) => [
            environmentVariable.key,
            environmentVariable.value
          ])
        )
      ),
      volumes: pruneArray(
        volumes.map(
          (volume) =>
            volume.name +
            (volume.containerPath ? `:${volume.containerPath}` : "") +
            (volume.accessMode ? `:${volume.accessMode}` : "")
        )
      ),
      ports: pruneArray(
        ports.map(
          (port) =>
            port.hostPort +
            (port.containerPort ? `:${port.containerPort}` : "") +
            (port.protocol ? `/${port.protocol}` : "")
        )
      ),
      profiles: pruneArray(profiles),
      labels: pruneObject(
        Object.fromEntries(labels.map((label) => [label.key, label.value]))
      )
    }
  };
};
