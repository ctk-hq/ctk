import { useState, useEffect, useMemo } from "react";
import { Formik } from "formik";

import { XIcon } from "@heroicons/react/outline";
import General from "./General";
import Data from "./Data";
import type { CallbackFunction, IServiceNodeItem } from "../../../../types";
import {
  getInitialValues,
  getFinalValues,
  validationSchema,
  tabs
} from "./form-utils";
import Environment from "./Environment";
import Build from "./Build";
import Deploy from "./Deploy";
import { toaster } from "../../../../utils";
import { reportErrorsAndSubmit } from "../../../../utils/forms";
import { ScrollView } from "../../../ScrollView";
import Modal from "../../../Modal";
import Tabs from "../../../Tabs";
import Tab from "../../../Tab";

export interface IModalServiceProps {
  node: IServiceNodeItem;
  onHide: CallbackFunction;
  onUpdateEndpoint: CallbackFunction;
}

const ModalServiceEdit = (props: IModalServiceProps) => {
  const { node, onHide, onUpdateEndpoint } = props;
  const [openTab, setOpenTab] = useState("General");
  const [selectedNode, setSelectedNode] = useState<IServiceNodeItem>();

  const handleUpdate = (values: any) => {
    onUpdateEndpoint(getFinalValues(values, selectedNode));
    toaster(`Updated "${values.serviceName}" service successfully`, "success");
  };

  const initialValues = useMemo(
    () => getInitialValues(selectedNode),
    [selectedNode]
  );

  useEffect(() => {
    if (node) {
      setSelectedNode(node);
    }
  }, [node]);

  return (
    <Modal onHide={onHide} title="Edit service">
      {selectedNode && (
        <Formik
          initialValues={initialValues}
          enableReinitialize={true}
          onSubmit={handleUpdate}
          validationSchema={validationSchema}
        >
          {(formik) => (
            <>
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

              <div className="flex items-center justify-end px-4 py-3 border-t border-solid border-blueGray-200 rounded-b">
                <button
                  className="btn-util"
                  type="button"
                  onClick={reportErrorsAndSubmit(formik)}
                >
                  Save
                </button>
              </div>
            </>
          )}
        </Formik>
      )}
    </Modal>
  );
};

export default ModalServiceEdit;
