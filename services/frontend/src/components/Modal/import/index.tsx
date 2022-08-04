import { useCallback, useMemo, useState } from "react";
import { Field, Formik } from "formik";
import { styled } from "@mui/joy";
import { XIcon } from "@heroicons/react/outline";
import { CallbackFunction } from "../../../types";
import { IImportForm } from "./form-utils";
import {
  getFinalValues,
  getInitialValues,
  validationSchema
} from "./form-utils";
import TextField from "../../global/FormElements/TextField";
import { toaster } from "../../../utils";
import { reportErrorsAndSubmit } from "../../../utils/forms";
import { ScrollView } from "../../ScrollView";
import lodash from "lodash";

interface IModalImportProps {
  onHide: CallbackFunction;
  onImport: CallbackFunction;
  importing: boolean;
}

const FormContainer = styled("div")`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const ModalImport = (props: IModalImportProps) => {
  const { onHide, onImport, importing } = props;

  const handleCreate = useCallback(
    (values: IImportForm, formik: any) => {
      const result = getFinalValues(values);
      onImport(result);
      toaster(`Importing...`, "success");
    },
    [onImport, onHide]
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
              <h3 className="text-sm font-semibold">Import</h3>
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
                    <ScrollView
                      className="relative px-4 py-3 flex-auto"
                      height={""}
                    >
                      <TextField label="yaml url" name="url" required={true} />

                      <label htmlFor="visibility" className="lbl-util">
                        Visibility
                      </label>

                      <input
                        id="visibility"
                        name="visibility"
                        className="checkbox-util"
                        type="checkbox"
                        onChange={formik.handleChange}
                      />

                      {importing && <>importing</>}
                    </ScrollView>
                  </div>

                  <div className="flex items-center justify-end px-4 py-3 border-t border-solid border-blueGray-200 rounded-b">
                    <button
                      className="btn-util"
                      type="button"
                      onClick={reportErrorsAndSubmit(formik)}
                    >
                      Import
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

export default ModalImport;
