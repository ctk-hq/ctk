import TextField from "../../../global/FormElements/TextField";
import Records from "../../../Records";
import { useFormikContext } from "formik";
import type { IEditVolumeForm } from "../../../../types";
import { Label } from "../../../ui/label";
import { Checkbox } from "../../../ui/checkbox";
import Toggle from "../../../global/FormElements/Toggle";

const General = () => {
  const formik = useFormikContext<IEditVolumeForm>();
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Entry name" name="entryName" required={true} />
      </div>

      <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Volume name" name="volumeName" required={true} />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="external-volume"
          checked={formik.values.external}
          onCheckedChange={(value) =>
            formik.setFieldValue("external", value === true)
          }
        />
        <Label htmlFor="external-volume">Use an existing volume or claim</Label>
      </div>
      <p className="text-sm text-muted-foreground">
        Existing resources are referenced by Volume name and are never created
        by this export.
      </p>
      {!formik.values.external && (
        <fieldset className="min-w-0 space-y-4">
          <legend className="mb-2 text-sm font-medium">
            Kubernetes storage
          </legend>
          <p className="text-sm text-muted-foreground">
            Choose these values before exporting a new PersistentVolumeClaim.
            Compose keeps its own volume settings.
          </p>
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Storage size"
              name="storageSize"
              placeholder="e.g. 5Gi"
              help="Required for a new Kubernetes claim."
            />
            <TextField
              label="Storage class"
              name="storageClass"
              help="Leave empty to use the cluster's default class."
            />
          </div>
          <Toggle
            name="accessMode"
            label="Access mode"
            help="ReadWriteOnce allows write mounts from one node; several Pods on that node can share the volume."
            options={[
              { text: "One node", value: "ReadWriteOnce" },
              { text: "Many nodes", value: "ReadWriteMany" },
              { text: "Read only", value: "ReadOnlyMany" },
              { text: "One Pod", value: "ReadWriteOncePod" }
            ]}
          />
        </fieldset>
      )}

      <Records
        name="labels"
        title="Labels"
        fields={(index: number) => [
          {
            name: `labels[${index}].key`,
            placeholder: "Key",
            required: true,
            type: "text"
          },
          {
            name: `labels[${index}].value`,
            placeholder: "Value",
            required: true,
            type: "text"
          }
        ]}
        newValue={{ key: "", value: "" }}
      />
    </div>
  );
};

export default General;
