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
import { toaster } from "../../../../utils";
import { reportErrorsAndSubmit } from "../../../../utils/forms";
import { ScrollView } from "../../../ScrollView";
import Modal from "../../../Modal";
import Tabs from "../../../Tabs";
import Tab from "../../../Tab";

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
            <Tabs value={openTab} onChange={setOpenTab}>
              {tabs.map((tab) => (
                <Tab key={tab.name} value={tab.name} title={tab.name} />
              ))}
            </Tabs>

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
