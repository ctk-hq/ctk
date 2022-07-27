import { FunctionComponent, ReactElement, useMemo, useState } from "react";
import { Formik } from "formik";
import General from "./General";
import IPam from "./IPam";
import Labels from "./Labels";
import { CallbackFunction } from "../../../types";
import { getInitialValues, tabs, validationSchema } from "./form-utils";
import { classNames } from "../../../utils/styles";

interface ICreateNetworkModalProps {
  onCreateNetwork: CallbackFunction;
}

const CreateNetworkModal: FunctionComponent<ICreateNetworkModalProps> = (
  props: ICreateNetworkModalProps
): ReactElement => {
  const { onCreateNetwork } = props;
  const [openTab, setOpenTab] = useState("General");

  const handleCreate = (values: any, formik: any) => {
    onCreateNetwork(values);
    formik.resetForm();
  };

  const initialValues = useMemo(() => getInitialValues(), []);

  return (
    <Formik
      initialValues={initialValues}
      enableReinitialize={true}
      onSubmit={handleCreate}
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
            {openTab === "IPAM" && <IPam />}
            {openTab === "Labels" && <Labels />}
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
        </>
      )}
    </Formik>
  );
};

export default CreateNetworkModal;
