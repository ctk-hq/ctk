import lodash from "lodash";
import * as yup from "yup";
import { IEditVolumeForm, IVolumeNodeItem } from "../../../types";
import { checkArray } from "../../../utils/forms";

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
  entryName: "unknown",
  volumeName: "unknown",
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

  const labels0: string[] = checkArray(labels, "labels");

  return {
    ...initialValues,
    entryName: node_name,
    volumeName: name,
    labels: labels0.map((label) => {
      const [key, value] = label.split("=");
      return {
        key,
        value
      };
    })
  };
};

export const getFinalValues = (
  values: IEditVolumeForm,
  previous?: IVolumeNodeItem
): IVolumeNodeItem => {
  const { labels } = values;

  return lodash.mergeWith(
    lodash.cloneDeep(previous) || {
      key: "volume",
      type: "VOLUME",
      inputs: [],
      outputs: [],
      config: {}
    },
    {
      canvasConfig: {
        node_name: values.entryName
      },
      volumeConfig: {
        name: values.volumeName,
        labels: labels.map(
          (label) => `${label.key}${label.value ? `=${label.value}` : ""}`
        )
      }
    },
    (obj, src) => {
      if (!lodash.isNil(src)) {
        return src;
      }
      return obj;
    }
  ) as any;
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
