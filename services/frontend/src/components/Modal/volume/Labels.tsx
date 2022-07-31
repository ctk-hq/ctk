import { styled } from "@mui/joy";
import Records from "../../Records";

const Root = styled("div")`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Labels = () => {
  return (
    <Root>
      <Records
        name="labels"
        title=""
        collapsible={false}
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
    </Root>
  );
};

export default Labels;
