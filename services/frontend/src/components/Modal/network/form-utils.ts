import * as yup from "yup";
import {
  IEditNetworkForm,
  IIPAM,
  INetworkNodeItem,
  IPAMConfig
} from "../../../types";
import { pruneArray, pruneObject } from "../../../utils/forms";

export const validationSchema = yup.object({
  entryName: yup
    .string()
    .max(256, "Entry name should be 256 characters or less")
    .required("Entry name is required"),

  networkName: yup
    .string()
    .max(256, "Network name should be 256 characters or less")
    .required("Network name is required"),

  driver: yup.string().max(256, "Driver should be 256 characters or less"),

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
  }
];

export const initialValues: IEditNetworkForm = {
  entryName: "",
  networkName: "",
  driver: "",
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
      ipam?.config?.map((item) => ({
        subnet: item.subnet ?? "",
        ipRange: item.ip_range ?? "",
        gateway: item.gateway ?? "",
        auxAddresses: Object.entries(item.aux_addresses ?? []).map(
          ([hostName, ipAddress]) => ({
            hostName,
            ipAddress
          })
        )
      })) ?? [],
    options: Object.keys(ipam?.options ?? {}).map((key) => {
      return {
        key,
        value: ipam?.options?.[key].toString() ?? ""
      };
    }),
    labels: labels
      ? Object.entries(labels as any).map(([key, value]: any) => ({
          key,
          value
        }))
      : []
  };
};

export const getFinalValues = (
  values: IEditNetworkForm,
  previous?: INetworkNodeItem
): INetworkNodeItem => {
  const { labels, driver, configurations, options } = values;

  return {
    key: previous?.key ?? "network",
    type: "NETWORK",
    position: {
      left: 0,
      top: 0
    },
    inputs: previous?.inputs ?? [],
    outputs: previous?.outputs ?? [],
    canvasConfig: {
      node_name: values.entryName
    },
    networkConfig: {
      name: values.networkName,
      ipam: pruneObject({
        driver: driver ? driver : undefined,
        config: pruneArray(
          configurations.map((configuration) =>
            pruneObject({
              subnet: configuration.subnet ? configuration.subnet : undefined,
              ip_range: configuration.ipRange
                ? configuration.ipRange
                : undefined,
              gateway: configuration.gateway
                ? configuration.gateway
                : undefined,
              aux_addresses: (() => {
                if (configuration.auxAddresses.length === 0) {
                  return undefined;
                }

                /* We do not have to worry about empty `hostName` and `ipAddress`
                 * values because Yup would report such values as error.
                 */
                return Object.fromEntries(
                  configuration.auxAddresses.map((auxAddress) => [
                    auxAddress.hostName,
                    auxAddress.ipAddress
                  ])
                );
              })()
            })
          )
        ) as IPAMConfig[],
        options: (() => {
          if (options.length === 0) {
            return undefined;
          }

          /* We do not have to worry about empty `key` and `value`
           * values because Yup would report such values as error.
           */
          return Object.fromEntries(
            options.map((option) => [option.key, option.value])
          );
        })()
      }) as IIPAM,
      labels: pruneObject(
        Object.fromEntries(labels.map((label) => [label.key, label.value]))
      ) as Record<string, string>
    }
  };
};
