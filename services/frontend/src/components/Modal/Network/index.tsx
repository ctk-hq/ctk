import { useState } from "react";
import { useFormik } from "formik";
import { XIcon } from "@heroicons/react/outline";
import General from "./General";
import IPam from "./IPam";
import Labels from "./Labels";
import { topLevelNetworkConfigInitialValues } from "../../../utils";
import { CallbackFunction } from "../../../types";

interface IModalNetworkProps {
  onHide: CallbackFunction;
}

const ModalNetwork = (props: IModalNetworkProps) => {
  const { onHide } = props;
  const [openTab, setOpenTab] = useState("General");

  const formik = useFormik({
    initialValues: {
      ...topLevelNetworkConfigInitialValues()
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
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 outline-none focus:outline-none">
        <div
          onClick={onHide}
          className="opacity-25 fixed inset-0 z-40 bg-black"
        ></div>
        <div className="relative w-auto my-6 mx-auto max-w-5xl z-50">
          <div className="border-0 rounded-lg shadow-lg relative flex flex-col w-full bg-white outline-none focus:outline-none">
            <div className="flex items-center justify-between px-4 py-3 border-b border-solid border-blueGray-200 rounded-t">
              <h3 className="text-sm font-semibold">Top level networks</h3>
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
                  {openTab === "IPam" && <IPam formik={formik} />}
                  {openTab === "Labels" && <Labels formik={formik} />}
                </form>
              </div>
            </div>

            <div className="flex items-center justify-end px-4 py-3 border-t border-solid border-blueGray-200 rounded-b">
              <button
                className="btn-util"
                type="button"
                onClick={() => {
                  formik.resetForm();
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalNetwork;
