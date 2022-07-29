import * as yup from "yup";
import { IEditVolumeForm, IVolumeNodeItem } from "../../../types";

export const validationSchema = yup.object({
  entryName: yup
    .string()
    .max(256, "Entry name should be 256 characters or less")
    .required("Entry name is required"),
  volumeName: yup
    .string()
    .max(256, "Volume name should be 256 characters or less")
    .required("Volume name is required"),
  labels: yup.array(
    yup.object({
      key: yup.string().required("Key is required")
    })
  )
});

const initialValues: IEditVolumeForm = {
  entryName: "",
  volumeName: "",
  labels: []
};

export const getInitialValues = (node?: IVolumeNodeItem): IEditVolumeForm => {
  if (!node) {
    return {
      ...initialValues
    };
  }

  const { canvasConfig, volumeConfig } = node;
  const { node_name = "" } = canvasConfig;
  const { name = "", labels } = volumeConfig;

  return {
    ...initialValues,
    entryName: node_name,
    volumeName: name,
    labels: Object.entries(labels as any).map(([key, value]: any) => ({
      key,
      value
    }))
  };
};

export const getFinalValues = (
  values: IEditVolumeForm,
  previous?: IVolumeNodeItem
): IVolumeNodeItem => {
  const { labels } = values;

  return {
    key: previous?.key ?? "volume",
    type: "VOLUME",
    inputs: previous?.inputs ?? [],
    outputs: previous?.outputs ?? [],
    config: (previous as any)?.config ?? {},
    canvasConfig: {
      node_name: values.entryName
    },
    volumeConfig: {
      name: values.volumeName,
      labels: Object.fromEntries(
        labels.map((label) => [label.key, label.value])
      )
    }
  } as any;
};

export const tabs = [
  {
    name: "General",
    href: "#",
    current: true,
    hidden: false
  },
  {
    name: "Labels",
    href: "#",
    current: false,
    hidden: false
  }
];
