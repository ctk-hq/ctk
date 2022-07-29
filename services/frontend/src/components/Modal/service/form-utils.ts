import type { IEditServiceForm, IServiceNodeItem } from "../../../types";
import * as yup from "yup";
import { checkArray, pruneObject } from "../../../utils/forms";

const initialValues: IEditServiceForm = {
  imageName: "",
  imageTag: "",
  serviceName: "",
  containerName: "",
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
      key: yup.string().required("Key is required")
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
    image,
    container_name = "",
    environment,
    volumes,
    ports,
    labels
  } = serviceConfig;

  const environment0: string[] = checkArray(environment, "environment");
  const volumes0: string[] = checkArray(volumes, "volumes");
  const ports0: string[] = checkArray(ports, "ports");
  const [imageName, imageTag] = (image ?? ":").split(":");

  return {
    ...initialValues,
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
    labels: Object.entries(labels as any).map(([key, value]: any) => ({
      key,
      value
    }))
  };
};

export const getFinalValues = (
  values: IEditServiceForm,
  previous?: IServiceNodeItem
): IServiceNodeItem => {
  const { environmentVariables, ports, volumes, labels } = values;

  return {
    key: previous?.key ?? "service",
    type: "SERVICE",
    position: { left: 0, top: 0 },
    inputs: previous?.inputs ?? ["op_source"],
    outputs: previous?.outputs ?? [],
    config: (previous as any)?.config ?? {},
    canvasConfig: {
      node_name: values.serviceName
    },
    serviceConfig: {
      image: `${values.imageName}${
        values.imageTag ? `:${values.imageTag}` : ""
      }`,
      container_name: values.containerName,
      environment: environmentVariables.map(
        (variable) =>
          `${variable.key}${variable.value ? `=${variable.value}` : ""}`
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
      labels: pruneObject(
        Object.fromEntries(labels.map((label) => [label.key, label.value]))
      )
    }
  } as any;
};
