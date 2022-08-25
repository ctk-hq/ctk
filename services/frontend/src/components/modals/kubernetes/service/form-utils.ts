import type { IServiceNodeItem } from "../../../../types";
import type { IEditServiceForm } from "../../../../types/kubernetes";
import * as yup from "yup";
import General from "./General";

export const tabs = [
  {
    value: "general",
    title: "General",
    component: General
  }
];

const initialValues: IEditServiceForm = {
  serviceName: ""
};

export const validationSchema = yup.object({
  serviceName: yup
    .string()
    .max(256, "Service name should be 256 characters or less")
    .required("Service name is required")
});

export const getInitialValues = (node?: IServiceNodeItem): IEditServiceForm => {
  if (!node) {
    return {
      ...initialValues
    };
  }

  const { canvasConfig } = node;
  const { node_name = "" } = canvasConfig;

  return {
    serviceName: node_name
  };
};

export const getFinalValues = (
  values: IEditServiceForm,
  previous?: IServiceNodeItem
): IServiceNodeItem => {
  return {
    key: previous?.key ?? "service",
    type: "SERVICE",
    position: previous?.position ?? { left: 0, top: 0 },
    inputs: previous?.inputs ?? ["op_source"],
    outputs: previous?.outputs ?? [],
    canvasConfig: {
      node_name: values.serviceName
    },
    serviceConfig: {}
  };
};
