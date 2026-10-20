import { type FunctionComponent, useCallback, useMemo, useState } from "react";
import { Formik } from "formik";
import { reportErrorsAndSubmit } from "../utils/forms";
import Modal from "./Modal";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
export interface ITab {
  value: string;
  title: string;
  component: FunctionComponent;
}
export interface IFormModalProps {
  title: string;
  tabs: ITab[];
  onHide: () => void;
  getFinalValues: (values: any, selectedNode?: any) => any;
  getInitialValues: (selectedNode?: any) => any;
  validationSchema: any;
  onCreate: (finalValues: any, values: any, formik: any) => void;
  selectedNode?: any;
}
export default function FormModal({
  title,
  tabs,
  getInitialValues,
  getFinalValues,
  validationSchema,
  onHide,
  onCreate,
  selectedNode
}: IFormModalProps) {
  const [openTab, setOpenTab] = useState(tabs[0].value);
  const initialValues = useMemo(
    () => getInitialValues(selectedNode),
    [getInitialValues, selectedNode]
  );
  const handleCreate = useCallback(
    async (values: any, formik: any) => {
      try {
        await onCreate(getFinalValues(values, selectedNode), values, formik);
        formik.setStatus(undefined);
      } catch (error) {
        formik.setStatus(
          error instanceof Error
            ? error.message
            : "Unable to save these settings."
        );
      }
    },
    [getFinalValues, onCreate, selectedNode]
  );
  return (
    <Modal title={title} onHide={onHide}>
      <Formik
        initialValues={initialValues}
        enableReinitialize
        onSubmit={handleCreate}
        validationSchema={validationSchema}
      >
        {(formik) => (
          <form
            className="flex min-h-0 flex-1 flex-col"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              reportErrorsAndSubmit(formik)();
            }}
          >
            <Tabs
              value={openTab}
              onValueChange={setOpenTab}
              className="min-h-0 gap-0"
            >
              <div className="shrink-0 px-6 py-4">
                <TabsList aria-label={title + " settings"}>
                  {tabs.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value}>
                      {tab.title}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              <div className="min-h-0 max-h-[60dvh] flex-1 overflow-y-auto overscroll-contain px-6 pb-6">
                {tabs.map(({ value, component: Component }) => (
                  <TabsContent key={value} value={value}>
                    {openTab === value && <Component />}
                  </TabsContent>
                ))}
              </div>
            </Tabs>
            {formik.status && (
              <p role="alert" className="px-6 pb-4 text-sm text-destructive">
                {formik.status}
              </p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={onHide}>
                Cancel
              </Button>
              <Button type="submit" disabled={formik.isSubmitting}>
                Save
              </Button>
            </DialogFooter>
          </form>
        )}
      </Formik>
    </Modal>
  );
}
