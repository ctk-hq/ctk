import { styled } from "@mui/joy";
import Records from "../../Records";

const Root = styled("div")`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Volumes = () => {
  return (
    <Root>
      <Records
        name="environmentVariables"
        title="Environment"
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
          hostPort: "",
          containerPort: "",
          protocol: ""
        }}
      />

      <Records
        name="volumes"
        title="Volumes"
        fields={(index: number) => [
          {
            name: `volumes[${index}].name`,
            placeholder: "Name",
            required: true,
            type: "text"
          },
          {
            name: `volumes[${index}].containerPath`,
            placeholder: "Container path",
            type: "text"
          },
          {
            name: `volumes[${index}].accessMode`,
            placeholder: "Access mode",
            type: "text"
          }
        ]}
        newValue={{
          name: "",
          containerPath: "",
          accessMode: ""
        }}
      />
    </Root>
  );
};

export default Volumes;
