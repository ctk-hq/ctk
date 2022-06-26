import React from "react";
import { useFormik } from "formik";
import { XIcon } from "@heroicons/react/outline";
import General from "./General";
import Container from "./Container";
import Resource from "./Resource";
import { initialValues, formatName } from "./../../../utils";
import { IClientNodeItem } from "../../../types";


interface IModalProps {
  node: IClientNodeItem | null;
  onHide: any;
  onUpdateEndpoint: any;
}

const ModalEdit = (props: IModalProps) => {
  const { node, onHide, onUpdateEndpoint } = props;
  const [selectedNode, setSelectedNode] = React.useState<IClientNodeItem | null>(null);
  const [openTab, setOpenTab] = React.useState("General");
  const formik = useFormik({
    initialValues: {
      configuration: {
        ...initialValues()
      }
    },
    onSubmit: ((values, { setSubmitting }) => {

    })
  });
  const tabs = [
    { name: 'General', href: '#', current: true, hidden: false },
    { name: 'Container', href: '#', current: false, hidden: (formik.values.configuration.type === 'container' ? false : true) },
    { name: 'Resource', href: '#', current: false, hidden: (formik.values.configuration.type === 'resource' ? false : true) }
  ];

  const classNames = (...classes: string[]) => {
    return classes.filter(Boolean).join(' ');
  }

  React.useEffect(() => {
    if (node) {
      setSelectedNode(node);
    }
  }, [node]);

  React.useEffect(() => {
    formik.resetForm();

    if (selectedNode) {
      formik.initialValues.configuration = { ...selectedNode.configuration };
    }
  }, [selectedNode]);

  React.useEffect(() => {
    return () => {
      formik.resetForm();
    }
  }, []);

  return (
    <>
      <div className="fixed z-50 inset-0 overflow-y-auto">
        <div className="justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 outline-none focus:outline-none">
          <div onClick={onHide} className="opacity-25 fixed inset-0 z-40 bg-black"></div>
          <div className="relative w-auto my-6 mx-auto max-w-5xl z-50">
            <div className="border-0 rounded-lg shadow-lg relative flex flex-col w-full bg-white outline-none focus:outline-none">
              <div className="flex items-center justify-between px-4 py-3 border-b border-solid border-blueGray-200 rounded-t">
                <h3 className="text-sm font-semibold">Update template</h3>
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
                <div className="sm:hidden">
                  <label htmlFor="tabs" className="sr-only">
                    Select a tab
                  </label>
                  <select
                    id="tabs"
                    name="tabs"
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    defaultValue={tabs.find((tab) => tab.current)!.name}
                  >
                    {tabs.map((tab) => (
                      <option key={tab.name}>{tab.name}</option>
                    ))}
                  </select>
                </div>

                <div className="hidden sm:block">
                  <div className="border-b border-gray-200 px-8">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                      {tabs.map((tab, index) => (
                        <a
                          key={tab.name}
                          href={tab.href}
                          className={classNames(
                            tab.name === openTab
                              ? 'border-indigo-500 text-indigo-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                            'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm',
                            (tab.hidden)
                              ? 'hidden'
                              : ''
                          )}
                          aria-current={tab.current ? 'page' : undefined}
                          onClick={e => {
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
                    {openTab === "General" &&
                      <General formik={formik} />
                    }

                    {openTab === "Container" &&
                      <Container formik={formik} />
                    }

                    {openTab === "Resource" &&
                      <Resource formik={formik} />
                    }
                  </form>
                </div>
              </div>

              <div className="flex items-center justify-end px-4 py-3 border-t border-solid border-blueGray-200 rounded-b">
                <button
                  className="btn-util"
                  type="button"
                  onClick={() => {
                    let updated = { ...selectedNode };
                    formik.values.configuration.name = formatName(formik.values.configuration.prettyName);
                    updated.configuration = formik.values.configuration;
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
    </>
  );
}

export default ModalEdit
