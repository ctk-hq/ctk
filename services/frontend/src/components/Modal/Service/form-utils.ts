import type { IEditServiceForm, IServiceNodeItem } from "../../../types";
import * as yup from "yup";
import lodash from "lodash";

const initialValues: IEditServiceForm = {
  serviceName: "",
  containerName: "",
  ports: [],
  environmentVariables: [],
  volumes: [],
  labels: []
};

export const validationSchema = yup.object({
  serviceName: yup
    .string()
    .max(256, "Service name should be 256 characters or less")
    .required("Service name is required"),
  containerName: yup
    .string()
    .max(256, "Container name should be 256 characters or less")
    .required("Container name is required"),
  ports: yup.array(
    yup.object({
      hostPort: yup.string().required("Host port is required"),
      containerPort: yup.string(),
      protocol: yup
        .string()
        .oneOf(["tcp", "udp"], "Protocol should be tcp or udp")
    })
  ),
  environmentVariables: yup.array(
    yup.object({
      key: yup.string().required("Key is required"),
      value: yup.string().required("Value is required")
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
      value: yup.string().required("Value is required")
    })
  )
});

export const getInitialValues = (
  node?: IServiceNodeItem
): IEditServiceForm => ({
  ...initialValues,
  serviceName: node?.canvasConfig.node_name || "",
  containerName: node?.serviceConfig.container_name || ""
});

export const transform = (
  values: IEditServiceForm,
  previous?: IServiceNodeItem
): IServiceNodeItem => {
  const { environmentVariables, ports, volumes, labels } = values;

  return lodash.merge(
    lodash.cloneDeep(previous) || {
      key: "service",
      type: "SERVICE",
      inputs: ["op_source"],
      outputs: [],
      config: {}
    },
    {
      canvasConfig: {
        node_name: values.serviceName,
        node_icon: ""
      },
      serviceConfig: {
        container_name: values.containerName,
        environment: environmentVariables.map(
          (variable) => `${variable.key}:${variable.value}`
        ),
        volumes: volumes.map(
          (volume) =>
            volume.name +
            (volume.containerPath ? `:${volume.containerPath}` : "") +
            (volume.accessMode ? `:${volume.accessMode}` : "")
        ),
        ports: ports.map(
          (port) =>
            port.hostPort +
            (port.containerPort ? `:${port.containerPort}` : "") +
            (port.protocol ? `/${port.protocol}` : "")
        ),
        labels: labels.map((label) => `${label.key}:${label.value}`)
      }
    }
  ) as any;
};
