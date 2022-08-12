import { useCallback, useMemo, useState } from "react";
import { Formik } from "formik";

import {
  getFinalValues,
  getInitialValues,
  tabs,
  validationSchema
} from "./form-utils";
import General from "./General";
import { CallbackFunction, IEditVolumeForm } from "../../../../types";
import { classNames } from "../../../../utils/styles";
import { toaster } from "../../../../utils";
import { reportErrorsAndSubmit } from "../../../../utils/forms";
import { ScrollView } from "../../../ScrollView";
import Modal from "../../../Modal";

interface ICreateVolumeModalProps {
  onHide: CallbackFunction;
  onAddEndpoint: CallbackFunction;
}

const CreateVolumeModal = (props: ICreateVolumeModalProps) => {
  const { onHide, onAddEndpoint } = props;
  const [openTab, setOpenTab] = useState("General");

  const handleCreate = useCallback((values: IEditVolumeForm, formik: any) => {
    onAddEndpoint(getFinalValues(values));
    formik.resetForm();
    onHide();

    toaster(`Created "${values.entryName}" volume successfully`, "success");
  }, []);

  const initialValues = useMemo(() => getInitialValues(), []);

  return (
    <Modal onHide={onHide} title="Add top level volume">
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

            <ScrollView height="500px" className="relative px-4 py-3 flex-auto">
              {openTab === "General" && <General />}
            </ScrollView>

            <div className="flex items-center justify-end px-4 py-3 border-t border-solid border-blueGray-200 rounded-b">
              <button
                className="btn-util"
                type="button"
                onClick={reportErrorsAndSubmit(formik)}
              >
                Add
              </button>
            </div>
          </>
        )}
      </Formik>
    </Modal>
  );
};

export default CreateVolumeModal;
