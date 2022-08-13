import { useEffect, useMemo, useState } from "react";
import { Formik } from "formik";
import { XIcon } from "@heroicons/react/outline";
import General from "./General";
import type {
  CallbackFunction,
  IEditVolumeForm,
  IVolumeNodeItem
} from "../../../../types";
import {
  getFinalValues,
  getInitialValues,
  tabs,
  validationSchema
} from "./form-utils";
import { toaster } from "../../../../utils";
import { reportErrorsAndSubmit } from "../../../../utils/forms";
import { ScrollView } from "../../../ScrollView";
import Tabs from "../../../Tabs";
import Tab from "../../../Tab";

interface IEditVolumeModal {
  node: IVolumeNodeItem;
  onHide: CallbackFunction;
  onUpdateEndpoint: CallbackFunction;
}

const EditVolumeModal = (props: IEditVolumeModal) => {
  const { node, onHide, onUpdateEndpoint } = props;
  const [openTab, setOpenTab] = useState("General");
  const [selectedNode, setSelectedNode] = useState<IVolumeNodeItem>();

  useEffect(() => {
    if (node) {
      setSelectedNode(node);
    }
  }, [node]);

  const handleUpdate = (values: IEditVolumeForm) => {
    onUpdateEndpoint(getFinalValues(values, selectedNode));

    toaster(`Updated "${values.entryName}" volume successfully`, "success");
  };

  const initialValues = useMemo(
    () => getInitialValues(selectedNode),
    [selectedNode]
  );

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
              <h3 className="text-sm font-semibold">Edit top level volumes</h3>
              <button
                className="p-1 ml-auto text-black float-right outline-none focus:outline-none"
                onClick={onHide}
              >
                <span className="block outline-none focus:outline-none">
                  <XIcon className="w-4" />
                </span>
              </button>
            </div>

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
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditVolumeModal;
