import { styled } from "@mui/joy";
import TextField from "../../global/FormElements/TextField";
import Records from "../../Records";

const Root = styled("div")`
  display: flex;
  flex-direction: column;
  row-gap: ${({ theme }) => theme.spacing(1)};
`;

const General = () => {
  return (
    <Root>
      <TextField label="Entry name" name="entryName" required={true} />
      <TextField label="Network name" name="networkName" required={true} />
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
    </Root>
  );
};

export default General;
