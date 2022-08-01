import { styled } from "@mui/joy";
import Records from "../../Records";

const Root = styled("div")`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Environment = () => {
  return (
    <Root>
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
    </Root>
  );
};

export default Environment;
