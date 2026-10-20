import { useMemo, useState } from "react";
import { Formik } from "formik";
import General from "./General";
import IPAM from "./IPAM";
import { getInitialValues, tabs, validationSchema } from "./form-utils";
import { reportErrorsAndSubmit } from "@/utils/forms";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
export default function NetworkForm({
  network,
  onSubmit
}: {
  network?: any;
  onSubmit: (values: any) => void;
}) {
  const [openTab, setOpenTab] = useState("General");
  const initialValues = useMemo(() => getInitialValues(network), [network]);
  return (
    <Formik
      initialValues={initialValues}
      enableReinitialize
      onSubmit={async (values, helpers) => {
        try {
          await onSubmit(values);
          helpers.setStatus(undefined);
        } catch (error) {
          helpers.setStatus(
            error instanceof Error
              ? error.message
              : "Unable to save this network."
          );
        }
      }}
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
            <div className="px-6 py-4">
              <TabsList aria-label="Network settings">
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.name} value={tab.name}>
                    {tab.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <div className="min-h-0 max-h-[60dvh] flex-1 overflow-y-auto overscroll-contain px-6 pb-6">
              <TabsContent value="General">
                <General />
              </TabsContent>
              <TabsContent value="IPAM">
                <IPAM />
              </TabsContent>
            </div>
          </Tabs>
          {formik.status && (
            <p role="alert" className="px-6 pb-4 text-sm text-destructive">
              {formik.status}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={formik.isSubmitting}>
              {network ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      )}
    </Formik>
  );
}
