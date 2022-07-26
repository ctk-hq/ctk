import { useState } from "react";
import { Formik } from "formik";
import * as yup from "yup";
import {
  topLevelNetworkConfigInitialValues,
  networkConfigCanvasInitialValues
} from "../../../utils";
import General from "./General";
import IPam from "./IPam";
import Labels from "./Labels";
import { CallbackFunction } from "../../../types";

interface INetworkCreateProps {
  onCreateNetwork: CallbackFunction;
}

const CreateNetworkModal = (props: INetworkCreateProps) => {
  const { onCreateNetwork } = props;
  const [openTab, setOpenTab] = useState("General");
  const handleCreate = (values: any, formik: any) => {
    onCreateNetwork(values);
    formik.resetForm();
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
          ...networkConfigCanvasInitialValues()
        },
        networkConfig: {
          ...topLevelNetworkConfigInitialValues()
        },
        key: "network",
        type: "NETWORK"
      }}
      enableReinitialize={true}
      onSubmit={(values, formik) => {
        handleCreate(values, formik);
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

          <div className="flex items-center justify-end px-4 py-3 border-t border-solid border-blueGray-200 rounded-b">
            <button
              className="btn-util"
              type="button"
              onClick={() => {
                formik.submitForm();
              }}
            >
              Create
            </button>
          </div>
        </>
      )}
    </Formik>
  );
};

export default CreateNetworkModal;
