import { FunctionComponent, ReactElement } from "react";
import TextField from "../../../global/FormElements/TextField";
import Records from "../../../Records";

const IPAM: FunctionComponent = (): ReactElement => {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Driver" name="driver" />
      </div>

      <Records
        name="configurations"
        title="Configurations"
        fields={(index: number) => [
          {
            name: `configurations[${index}].subnet`,
            label: "Subnet",
            type: "text"
          },
          {
            name: `configurations[${index}].ipRange`,
            label: "IP Range",
            type: "text"
          },
          {
            name: `configurations[${index}].gateway`,
            label: "Gateway",
            type: "text"
          },
          {
            name: `configurations[${index}].auxAddresses`,
            type: "records",
            // TODO: Remove placeholder from the main object.
            placeholder: "",
            options: {
              defaultOpen: true,
              name: `configurations[${index}].auxAddresses`,
              modal: "configuration",
              title: "Aux addresses",
              referred: "aux address",
              fields: (index2: number) => [
                {
                  name: `configurations[${index}].auxAddresses[${index2}].hostName`,
                  label: "Host name",
                  type: "text"
                },
                {
                  name: `configurations[${index}].auxAddresses[${index2}].ipAddress`,
                  label: "IP address",
                  type: "text"
                }
              ],
              newValue: {
                hostName: "",
                ipAddress: ""
              },
              renderField: (element: ReactElement): ReactElement => (
                <div className="w-full min-w-0">{element}</div>
              ),
              renderRemove: (element: ReactElement): ReactElement => (
                <div className="mt-6 shrink-0">{element}</div>
              )
            }
          }
        ]}
        newValue={{
          subnet: "",
          ipRange: "",
          gateway: "",
          auxAddresses: []
        }}
        renderLayout={(elements: ReactElement[]): ReactElement => (
          <div className="flex min-w-0 flex-1 flex-col gap-4 rounded-md border p-4">
            <div className="flex w-full min-w-0 flex-col gap-4 sm:flex-row">
              {elements[0]}
              {elements[1]}
              {elements[2]}
            </div>
            {elements[3]}
          </div>
        )}
        renderField={(element: ReactElement): ReactElement => (
          <div className="w-full min-w-0">{element}</div>
        )}
        renderRemove={(element: ReactElement): ReactElement => (
          <div className="mt-6 shrink-0">{element}</div>
        )}
        renderBorder={() => <div className="my-2 h-px w-full bg-border" />}
      />

      <Records
        name="options"
        title="Options"
        fields={(index: number) => [
          {
            name: `options[${index}].key`,
            placeholder: "Key",
            required: true,
            type: "text"
          },
          {
            name: `options[${index}].value`,
            placeholder: "Value",
            required: true,
            type: "text"
          }
        ]}
        newValue={{ key: "", value: "" }}
        renderField={(element: ReactElement): ReactElement => (
          <div className="w-full min-w-0">{element}</div>
        )}
      />
    </div>
  );
};

export default IPAM;
