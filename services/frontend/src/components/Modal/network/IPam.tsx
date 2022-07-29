import { ReactElement } from "react";
import { styled } from "@mui/joy";

import TextField from "../../global/FormElements/TextField";
import { IFieldType } from "../../Record";
import Records from "../../Records";

const Fields = styled("div")`
  display: flex;
  flex-direction: column;
  row-gap: ${({ theme }) => theme.spacing(1)};
  width: 100%;
`;

const Field = styled("div")`
  width: 100%;
`;

const Remove = styled("div")`
  margin-top: ${({ theme }) => theme.spacing(2)};
`;

const Configuration = styled("div")`
  display: flex;
  flex-direction: column;
  row-gap: ${({ theme }) => theme.spacing(1)};
  padding-left: ${({ theme }) => theme.spacing(4)};
`;

const ConfigurationTop = styled("div")`
  display: flex;
  flex-direction: row;
  column-gap: ${({ theme }) => theme.spacing(1)};
`;

const ConfigurationBorder = styled("div")`
  border-bottom: dotted 1px black;
  height: 1px;
  width: 40px;
  margin: 8px 0px 0px 0px;
`;

const IPam = () => {
  return (
    <Fields>
      <TextField label="Driver" name="driver" />

      <Records
        name="configurations"
        modal="network"
        title="Configurations"
        referred="configuration"
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
                <Field>{element}</Field>
              ),
              renderRemove: (element: ReactElement): ReactElement => (
                <Remove>{element}</Remove>
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
          <Configuration>
            <ConfigurationTop>
              {elements[0]}
              {elements[1]}
              {elements[2]}
            </ConfigurationTop>
            {elements[3]}
          </Configuration>
        )}
        renderField={(
          element: ReactElement,
          field: IFieldType
        ): ReactElement => (
          <Field style={{ paddingLeft: field.type === "records" ? 16 : 0 }}>
            {element}
          </Field>
        )}
        renderRemove={(element: ReactElement): ReactElement => (
          <Remove>{element}</Remove>
        )}
        renderBorder={() => <ConfigurationBorder />}
      />

      <Records
        name="options"
        modal="network"
        title="Options"
        referred="option"
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
          <Field>{element}</Field>
        )}
      />
    </Fields>
  );
};

export default IPam;
