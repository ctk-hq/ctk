import { useCallback, useMemo, useState } from "react";
import { Formik } from "formik";
import { XIcon } from "@heroicons/react/outline";
import General from "./General";
import Data from "./Data";
import { CallbackFunction, IEditServiceForm } from "../../../types";
import {
  getFinalValues,
  getInitialValues,
  tabs,
  validationSchema
} from "./form-utils";
import Build from "./Build";
import { styled } from "@mui/joy";
import Environment from "./Environment";
import Deploy from "./Deploy";
import { classNames } from "../../../utils/styles";

interface IModalServiceProps {
  onHide: CallbackFunction;
  onAddEndpoint: CallbackFunction;
}

const FormContainer = styled("div")`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const TabBody = styled("div")`
  overflow: auto;

  ::-webkit-scrollbar {
    width: 4px;
  }

  /* Track */
  ::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  /* Handle */
  ::-webkit-scrollbar-thumb {
    background: #888;
  }

  /* Handle on hover */
  ::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`;

const ModalServiceCreate = (props: IModalServiceProps) => {
  const { onHide, onAddEndpoint } = props;
  const [openTab, setOpenTab] = useState("General");

  const handleCreate = useCallback(
    (values: IEditServiceForm, formik: any) => {
      const result = getFinalValues(values);
      onAddEndpoint(result);
      formik.resetForm();
      onHide();
    },
    [onAddEndpoint, onHide]
  );

  const initialValues = useMemo(() => getInitialValues(), []);

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
              <h3 className="text-sm font-semibold">Add service</h3>
              <button
                className="p-1 ml-auto text-black float-right outline-none focus:outline-none"
                onClick={onHide}
              >
                <span className="block outline-none focus:outline-none">
                  <XIcon className="w-4" />
                </span>
              </button>
            </div>

            <Formik
              initialValues={initialValues}
              enableReinitialize={true}
              onSubmit={handleCreate}
              validationSchema={validationSchema}
            >
              {(formik) => (
                <FormContainer>
                  <div>
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

                    <TabBody className="relative px-4 py-3 flex-auto">
                      {openTab === "General" && <General />}
                      {openTab === "Environment" && <Environment />}
                      {openTab === "Data" && <Data />}
                      {openTab === "Build" && <Build />}
                      {openTab === "Deploy" && <Deploy />}
                    </TabBody>
                  </div>

                  <div className="flex items-center justify-end px-4 py-3 border-t border-solid border-blueGray-200 rounded-b">
                    <button
                      className="btn-util"
                      type="button"
                      onClick={formik.submitForm}
                    >
                      Add
                    </button>
                  </div>
                </FormContainer>
              )}
            </Formik>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalServiceCreate;
