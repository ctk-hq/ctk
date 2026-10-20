import * as yup from "yup";
import { IEditVolumeForm, IVolumeNodeItem } from "../../../../types";
import { pruneObject } from "../../../../utils/forms";
import { preserveFormChanges } from "../../../../utils/form-preservation";
import { extractObjectOrArray } from "../../../../utils/forms";
import General from "./General";

export const validationSchema = yup.object({
  entryName: yup
    .string()
    .max(256, "Entry name should be 256 characters or less")
    .required("Entry name is required"),
  volumeName: yup
    .string()
    .max(256, "Volume name should be 256 characters or less")
    .required("Volume name is required"),
  external: yup.boolean(),
  storageSize: yup
    .string()
    .matches(/^(?:\d+(?:\.\d+)?)(?:[KMGTPE]i?|[kMGTPE])?$/, {
      message: "Use a storage quantity such as 5Gi",
      excludeEmptyString: true
    })
    .test(
      "positive",
      "Storage must be greater than zero",
      (value) => !value || parseFloat(value) > 0
    ),
  storageClass: yup.string(),
  accessMode: yup
    .string()
    .oneOf([
      "",
      "ReadWriteOnce",
      "ReadWriteMany",
      "ReadOnlyMany",
      "ReadWriteOncePod"
    ]),
  labels: yup.array(
    yup.object({
      key: yup.string().required("Key is required")
    })
  )
});

const initialValues: IEditVolumeForm = {
  entryName: "",
  volumeName: "",
  external: false,
  storageSize: "",
  storageClass: "",
  accessMode: "",
  labels: []
};

export const getInitialValues = (node?: IVolumeNodeItem): IEditVolumeForm => {
  if (!node) {
    return structuredClone(initialValues);
  }

  const { canvasConfig, volumeConfig } = node;
  const { node_name = "" } = canvasConfig;
  const { name = "", labels } = volumeConfig;

  return {
    ...initialValues,
    entryName: node_name,
    volumeName: name || node_name,
    external: volumeConfig.external === true,
    storageSize: node.kubernetes?.size ?? "",
    storageClass: node.kubernetes?.storageClass ?? "",
    accessMode: node.kubernetes?.accessMode ?? "",
    labels: extractObjectOrArray("=", "key", "value", labels) ?? []
  };
};

export const getFinalValues = (
  values: IEditVolumeForm,
  previous?: IVolumeNodeItem
): IVolumeNodeItem => {
  const { labels } = values;

  const result: IVolumeNodeItem = {
    key: previous?.key ?? "volume",
    type: "VOLUME",
    position: previous?.position ?? { left: 0, top: 0 },
    inputs: previous?.inputs ?? [],
    outputs: previous?.outputs ?? [],
    canvasConfig: {
      node_name: values.entryName
    },
    kubernetes:
      values.storageSize || values.accessMode || values.storageClass
        ? ({
            size: values.storageSize,
            storageClass: values.storageClass || undefined,
            accessMode: values.accessMode || undefined
          } as IVolumeNodeItem["kubernetes"])
        : undefined,
    volumeConfig: {
      name: values.volumeName,
      external: values.external || undefined,
      labels: pruneObject(
        Object.fromEntries(labels.map((label) => [label.key, label.value]))
      ) as Record<string, string>
    }
  };
  if (previous)
    result.volumeConfig =
      preserveFormChanges(
        previous.volumeConfig,
        getFinalValues(getInitialValues(previous)).volumeConfig,
        result.volumeConfig
      ) ?? {};
  return result;
};

export const tabs = [
  {
    title: "General",
    value: "general",
    component: General
  }
];
