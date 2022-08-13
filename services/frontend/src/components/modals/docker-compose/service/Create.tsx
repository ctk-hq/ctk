import { useCallback, useMemo, useState } from "react";
import { Formik } from "formik";
import { XIcon } from "@heroicons/react/outline";
import General from "./General";
import Data from "./Data";
import { CallbackFunction, IEditServiceForm } from "../../../../types";
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
import { toaster } from "../../../../utils";
import { reportErrorsAndSubmit } from "../../../../utils/forms";
import { ScrollView } from "../../../ScrollView";
import Modal from "../../../Modal";
import Tabs from "../../../Tabs";
import Tab from "../../../Tab";

interface IModalServiceProps {
  onHide: CallbackFunction;
  onAddEndpoint: CallbackFunction;
}

const FormContainer = styled("div")`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
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
      toaster(
        `Created "${values.serviceName}" service successfully`,
        "success"
      );
    },
    [onAddEndpoint, onHide]
  );

  const initialValues = useMemo(() => getInitialValues(), []);

  return (
    <Modal onHide={onHide} title="Add service">
      <Formik
        initialValues={initialValues}
        enableReinitialize={true}
        onSubmit={handleCreate}
        validationSchema={validationSchema}
      >
        {(formik) => (
          <FormContainer>
            <div>
              <Tabs value={openTab} onChange={setOpenTab}>
                {tabs.map((tab) => (
                  <Tab key={tab.name} value={tab.name} title={tab.name} />
                ))}
              </Tabs>

              <ScrollView
                height="500px"
                className="relative px-4 py-3 flex-auto"
              >
                {openTab === "General" && <General />}
                {openTab === "Environment" && <Environment />}
                {openTab === "Data" && <Data />}
                {openTab === "Build" && <Build />}
                {openTab === "Deploy" && <Deploy />}
              </ScrollView>
            </div>

            <div className="flex items-center justify-end px-4 py-3 border-t border-solid border-blueGray-200 rounded-b">
              <button
                className="btn-util"
                type="button"
                onClick={reportErrorsAndSubmit(formik)}
              >
                Add
              </button>
            </div>
          </FormContainer>
        )}
      </Formik>
    </Modal>
  );
};

export default ModalServiceCreate;
