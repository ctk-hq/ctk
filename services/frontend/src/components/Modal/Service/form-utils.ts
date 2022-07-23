import { IEditServiceForm, IServiceNodeItem } from "../../../types";
import * as yup from "yup";

const initialValues: IEditServiceForm = {
  serviceName: "",
  containerName: "",
  ports: [],
  environmentVariables: [],
  volumes: [],
  labels: []
};

export const getInitialValues = (
  node?: IServiceNodeItem
): IEditServiceForm => ({
  ...initialValues,
  serviceName: node?.canvasConfig.node_name || "",
  containerName: node?.serviceConfig.container_name || ""
});

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
