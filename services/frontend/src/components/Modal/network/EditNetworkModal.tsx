import { useState } from "react";
import { Formik } from "formik";
import * as yup from "yup";
import { TrashIcon } from "@heroicons/react/outline";
import General from "./General";
import IPam from "./IPam";
import Labels from "./Labels";
import {
  CallbackFunction,
  ICanvasConfig,
  INetworkTopLevel
} from "../../../types";

interface IEditNetworkModalProps {
  onUpdateNetwork: CallbackFunction;
  onDeleteNetwork: CallbackFunction;
  network: any;
}

const EditNetworkModal = (props: IEditNetworkModalProps) => {
  const { onUpdateNetwork, onDeleteNetwork, network } = props;
  const [openTab, setOpenTab] = useState("General");
  const handleUpdate = (values: any) => {
    const updated = { ...network };
    updated.canvasConfig = values.canvasConfig;
    updated.networkConfig = values.networkConfig;
    onUpdateNetwork(updated);
  };
  const validationSchema = yup.object({
    canvasConfig: yup.object({
      node_name: yup
        .string()
        .max(256, "network name should be 256 characters or less")
        .required("network name is required")
    }),
    networkConfig: yup.object({
      name: yup
        .string()
        .max(256, "name should be 256 characters or less")
        .required("name is required")
    })
  });
  const tabs = [
    {
      name: "General",
      href: "#",
      current: true,
      hidden: false
    },
    {
      name: "Ipam",
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
  const classNames = (...classes: string[]) => {
    return classes.filter(Boolean).join(" ");
  };

  return (
    <Formik
      initialValues={{
        canvasConfig: {
          ...network.canvasConfig
        } as ICanvasConfig,
        networkConfig: {
          ...network.networkConfig
        } as INetworkTopLevel
      }}
      enableReinitialize={true}
      onSubmit={(values) => {
        handleUpdate(values);
      }}
      validationSchema={validationSchema}
    >
      {(formik) => (
        <>
          <div className="border-b border-gray-200 px-4 md:px-8">
            <nav
              className="-mb-px flex space-x-4 md:space-x-8"
              aria-label="Tabs"
            >
              {tabs.map((tab) => (
                <a
                  key={tab.name}
                  href={tab.href}
                  className={classNames(
                    tab.name === openTab
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
                    "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm",
                    tab.hidden ? "hidden" : ""
                  )}
                  aria-current={tab.current ? "page" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    setOpenTab(tab.name);
                  }}
                >
                  {tab.name}
                </a>
              ))}
            </nav>
          </div>

          <div className="relative px-4 py-3 flex-auto">
            {openTab === "General" && <General />}
            {openTab === "IPam" && <IPam />}
            {openTab === "Labels" && <Labels />}
          </div>

          <div className="flex justify-between items-center justify-end px-4 py-3 border-t border-solid border-blueGray-200 rounded-b">
            <button
              className="btn-util-red"
              type="button"
              onClick={onDeleteNetwork}
            >
              <TrashIcon className="w-4 h-4" />
            </button>

            <button
              className="btn-util"
              type="button"
              onClick={() => {
                formik.submitForm();
              }}
            >
              Update
            </button>
          </div>
        </>
      )}
    </Formik>
  );
};

export default EditNetworkModal;
