import { useCallback, useMemo } from "react";
import { Formik } from "formik";
import { CallbackFunction } from "@/types";
import {
  getFinalValues,
  getInitialValues,
  validationSchema,
  IImportForm
} from "./form-utils";
import TextField from "@/components/global/FormElements/TextField";
import { toaster } from "@/utils";
import { reportErrorsAndSubmit } from "@/utils/forms";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
interface IModalImportProps {
  onHide: CallbackFunction;
  onImport: CallbackFunction;
  importing: boolean;
}
export default function ModalImport({
  onHide,
  onImport,
  importing
}: IModalImportProps) {
  const handleCreate = useCallback(
    (values: IImportForm) => {
      onImport(getFinalValues(values));
      toaster("Importing…", "success");
    },
    [onImport]
  );
  const initialValues = useMemo(() => getInitialValues(), []);
  return (
    <Modal title="Import" onHide={onHide}>
      <Formik
        initialValues={initialValues}
        enableReinitialize
        onSubmit={handleCreate}
        validationSchema={validationSchema}
      >
        {(formik) => (
          <form
            className="flex min-h-0 flex-col"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              reportErrorsAndSubmit(formik)();
            }}
          >
            <div className="space-y-5 overflow-y-auto p-6">
              <TextField label="YAML URL" name="url" required />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="visibility"
                  checked={Boolean(formik.values.visibility)}
                  onCheckedChange={(value) =>
                    formik.setFieldValue("visibility", value === true)
                  }
                />
                <Label htmlFor="visibility">Make project public</Label>
              </div>
              {importing && (
                <p role="status" className="text-sm text-muted-foreground">
                  Importing…
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onHide()}>
                Cancel
              </Button>
              <Button type="submit" disabled={importing}>
                Import
              </Button>
            </DialogFooter>
          </form>
        )}
      </Formik>
    </Modal>
  );
}
