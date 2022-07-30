import type { IEditServiceForm, IServiceNodeItem } from "../../../types";
import * as yup from "yup";
import {
  checkArray,
  pruneArray,
  pruneObject,
  extractObjectOrArray,
  extractArray,
  pruneString
} from "../../../utils/forms";

export const tabs = [
  {
    name: "General",
    href: "#",
    current: true,
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
    context: yup.string().required("Context is required"),
    dockerfile: yup.string(),
    arguments: yup.array(
      yup.object({
        key: yup.string().required("Key is required"),
        value: yup.string()
      })
    ),
    sshAuthentications: yup.object({
      id: yup.string().required("ID is required"),
      path: yup.string()
    }),
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
    image,
    container_name = "",
    environment,
    volumes,
    ports,
    profiles,
    labels
  } = serviceConfig;

  const environment0: string[] = checkArray(environment || [], "environment");
  const volumes0: string[] = checkArray(volumes, "volumes");
  const ports0: string[] = checkArray(ports, "ports");
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
    imageName,
    imageTag,
    serviceName: node_name,
    containerName: container_name,
    environmentVariables: environment0.map((variable) => {
      const [key, value] = variable.split("=");
      return {
        key,
        value: value ? value : ""
      };
    }),
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
    profiles: profiles ?? [],
    labels: labels
      ? Object.entries(labels as any).map(([key, value]: any) => ({
          key,
          value
        }))
      : []
  };
};

export const getFinalValues = (
  values: IEditServiceForm,
  previous?: IServiceNodeItem
): IServiceNodeItem => {
  const { build, environmentVariables, ports, profiles, volumes, labels } =
    values;

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
        context: build.context,
        dockerfile: pruneString(build.dockerfile),
        args: pruneObject(build.arguments),
        ssh: pruneArray(
          build.sshAuthentications.map((authentication) =>
            [authentication.id, authentication.path].join("=")
          )
        ),
        cache_from: pruneArray(build.cacheFrom),
        cache_to: pruneArray(build.cacheTo),
        extra_hosts: pruneArray(
          build.extraHosts.map((extraHost) =>
            [extraHost.hostName, extraHost.ipAddress].join(":")
          )
        ),
        isolation: pruneString(build.isolation),
        labels: pruneObject(build.labels),
        // NOTE: This could be a potential bug for "0".
        shm_size: pruneString(build.sharedMemorySize),
        target: pruneString(build.target)
      }),
      image: `${values.imageName}${
        values.imageTag ? `:${values.imageTag}` : ""
      }`,
      container_name: values.containerName,
      environment: pruneArray(
        environmentVariables.map(
          (variable) =>
            `${variable.key}${variable.value ? `=${variable.value}` : ""}`
        )
      ),
      volumes: volumes.length
        ? volumes.map(
            (volume) =>
              volume.name +
              (volume.containerPath ? `:${volume.containerPath}` : "") +
              (volume.accessMode ? `:${volume.accessMode}` : "")
          )
        : [],
      ports: ports.map(
        (port) =>
          port.hostPort +
          (port.containerPort ? `:${port.containerPort}` : "") +
          (port.protocol ? `/${port.protocol}` : "")
      ),
      profiles: pruneArray(profiles),
      labels: pruneObject(
        Object.fromEntries(labels.map((label) => [label.key, label.value]))
      )
    }
  };
};
