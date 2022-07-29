import lodash from "lodash";
import * as yup from "yup";
import { IEditNetworkForm, INetworkNodeItem } from "../../../types";

export const validationSchema = yup.object({
  entryName: yup
    .string()
    .max(256, "Entry name should be 256 characters or less")
    .required("Entry name is required"),

  networkName: yup
    .string()
    .max(256, "Network name should be 256 characters or less")
    .required("Network name is required"),

  driver: yup
    .string()
    .max(256, "Driver should be 256 characters or less")
    .default("default"),

  configurations: yup.array(
    yup.object({
      subnet: yup.string(),
      ipRange: yup.string(),
      gateway: yup.string(),
      auxAddresses: yup.array(
        yup.object({
          hostName: yup.string().required("Host name is required"),
          ipAddress: yup.string().required("IP address is required")
        })
      )
    })
  ),

  options: yup.array(
    yup.object({
      key: yup.string().required("Key is required"),
      value: yup.string().required("Value is required")
    })
  ),

  labels: yup.array(
    yup.object({
      key: yup.string().required("Key is required"),
      value: yup.string().required("Value is required")
    })
  )
});

export const tabs = [
  {
    name: "General",
    href: "#",
    current: true,
    hidden: false
  },
  {
    name: "IPAM",
    href: "#",
    current: false,
    hidden: false
  },
  {
    name: "Labels",
    href: "#",
    current: false,
    hidden: false
  }
];

export const initialValues: IEditNetworkForm = {
  entryName: "unknown",
  networkName: "unknown",
  driver: "default",
  configurations: [],
  options: [],
  labels: []
};

export const getInitialValues = (node?: INetworkNodeItem): IEditNetworkForm => {
  if (!node) {
    return {
      ...initialValues
    };
  }

  const { canvasConfig, networkConfig } = node;
  const { node_name = "" } = canvasConfig;
  const { name = "", ipam, labels } = networkConfig;

  return {
    ...initialValues,
    entryName: node_name,
    networkName: name,
    driver: ipam?.driver ?? "",
    configurations:
      ipam?.config.map((item) => ({
        subnet: item.subnet,
        ipRange: item.ip_range,
        gateway: item.gateway,
        auxAddresses: Object.entries(item.aux_addresses).map(
          ([hostName, ipAddress]) => ({
            hostName,
            ipAddress
          })
        )
      })) ?? [],
    options: Object.keys(ipam?.options || {}).map((key) => {
      if (!ipam) {
        throw new Error("Control should not reach here.");
      }
      return {
        key,
        value: ipam.options[key].toString()
      };
    }),
    labels: Object.entries(labels as any).map(([key, value]: any) => ({
      key,
      value
    }))
  };
};

export const getFinalValues = (
  values: IEditNetworkForm,
  previous?: INetworkNodeItem
): INetworkNodeItem => {
  const { labels, driver, configurations, options } = values;

  return {
    key: "network",
    type: "NETWORK",
    inputs: previous?.inputs ?? [],
    outputs: previous?.outputs ?? [],
    config: (previous as any)?.config ?? {},
    canvasConfig: {
      node_name: values.entryName
    },
    networkConfig: {
      name: values.networkName,
      ipam: {
        driver,
        config: configurations.map((configuration) => ({
          subnet: configuration.subnet,
          ip_range: configuration.ipRange,
          gateway: configuration.gateway,
          aux_addresses: Object.fromEntries(
            configuration.auxAddresses.map((auxAddress) => [
              auxAddress.hostName,
              auxAddress.ipAddress
            ])
          )
        })),
        options: Object.fromEntries(
          options.map((option) => [option.key, option.value])
        )
      },
      labels: Object.fromEntries(
        labels.map((label) => [label.key, label.value])
      )
    }
  } as any;
};
