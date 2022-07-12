import { useState, useEffect } from "react";
import { useFormik } from "formik";
import { XIcon } from "@heroicons/react/outline";
import General from "./General";
import Environment from "./Environment";
import Volumes from "./Volumes";
import Labels from "./Labels";
import { canvasConfigInitialValues } from "../../../utils";
import {
  CallbackFunction,
  ICanvasConfig,
  IServiceNodeItem,
  IService
} from "../../../types";

interface IModalServiceProps {
  node: any;
  onHide: CallbackFunction;
  onUpdateEndpoint: CallbackFunction;
}

const ModalServiceEdit = (props: IModalServiceProps) => {
  const { node, onHide, onUpdateEndpoint } = props;
  const [openTab, setOpenTab] = useState("General");
  const [selectedNode, setSelectedNode] = useState<IServiceNodeItem>();
  const formik = useFormik({
    initialValues: {
      canvasConfig: {
        ...canvasConfigInitialValues()
      },
      serviceConfig: {
        container_name: ""
      }
    },
    onSubmit: () => undefined
  });
  const tabs = [
    {
      name: "General",
      href: "#",
      current: true,
      hidden: false
    },
    {
      name: "Environment",
      href: "#",
      current: false,
      hidden: false
    },
    {
      name: "Volumes",
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

  useEffect(() => {
    if (node) {
      setSelectedNode(node);
    }
  }, [node]);

  useEffect(() => {
    formik.resetForm();

    if (selectedNode) {
      formik.initialValues.canvasConfig = {
        ...selectedNode.canvasConfig
      } as ICanvasConfig;
      formik.initialValues.serviceConfig = {
        ...selectedNode.serviceConfig
      } as IService;
    }
  }, [selectedNode]);

  useEffect(() => {
    return () => {
      formik.resetForm();
    };
  }, []);

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 outline-none focus:outline-none">
        <div
          onClick={onHide}
          className="opacity-25 fixed inset-0 z-40 bg-black"
        ></div>
        <div className="relative w-auto my-6 mx-auto max-w-5xl z-50">
          <div className="border-0 rounded-lg shadow-lg relative flex flex-col w-full bg-white outline-none focus:outline-none">
            <div className="flex items-center justify-between px-4 py-3 border-b border-solid border-blueGray-200 rounded-t">
              <h3 className="text-sm font-semibold">Update service</h3>
              <button
                className="p-1 ml-auto text-black float-right outline-none focus:outline-none"
                onClick={onHide}
              >
                <span className="block outline-none focus:outline-none">
                  <XIcon className="w-4" />
                </span>
              </button>
            </div>

            <div>
              <div className="hidden sm:block">
                <div className="border-b border-gray-200 px-8">
                  <nav className="-mb-px flex space-x-8" aria-label="Tabs">
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
              </div>

              <div className="relative px-4 py-3 flex-auto">
                <form onSubmit={formik.handleSubmit}>
                  {openTab === "General" && <General formik={formik} />}
                  {openTab === "Environment" && <Environment formik={formik} />}
                  {openTab === "Volumes" && <Volumes formik={formik} />}
                  {openTab === "Labels" && <Labels formik={formik} />}
                </form>
              </div>
            </div>

            <div className="flex items-center justify-end px-4 py-3 border-t border-solid border-blueGray-200 rounded-b">
              <button
                className="btn-util"
                type="button"
                onClick={() => {
                  const updated = { ...selectedNode };
                  updated.canvasConfig = formik.values.canvasConfig;
                  updated.serviceConfig = formik.values.serviceConfig;
                  onUpdateEndpoint(updated);
                }}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalServiceEdit;
