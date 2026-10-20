import Records from "../../../Records";
import { useFormikContext } from "formik";
import type { IEditServiceForm } from "../../../../types";
import { Label } from "../../../ui/label";
import { Textarea } from "../../../ui/textarea";

const Environment = () => {
  const formik = useFormikContext<IEditServiceForm>();
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="envFile">Environment files</Label>
        <Textarea
          id="envFile"
          name="envFile"
          value={formik.values.envFile}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          aria-describedby="envFile-help"
          rows={3}
        />
        <p id="envFile-help" className="text-sm text-muted-foreground">
          One path per line, in precedence order. File references remain in
          Compose; the browser does not read their contents.
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        Use a reference such as <code>{"${DB_PASSWORD}"}</code> for a private
        value. Manage references and saved values with the project’s Variables
        button.
      </p>
      <Records
        name="environmentVariables"
        title=""
        collapsible={false}
        fields={(index: number) => [
          {
            name: `environmentVariables[${index}].key`,
            placeholder: "Key",
            required: true,
            type: "text"
          },
          {
            name: `environmentVariables[${index}].value`,
            placeholder: "Value",
            required: false,
            type: "text"
          }
        ]}
        newValue={{
          key: "",
          value: ""
        }}
      />
    </div>
  );
};

export default Environment;
