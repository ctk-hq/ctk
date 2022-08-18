import { styled } from "@mui/joy";

import TextField from "../../../global/FormElements/TextField";
import Records from "../../../Records";

const Root = styled("div")`
  display: flex;
  flex-direction: column;
  row-gap: ${({ theme }) => theme.spacing(1)};
  @media (max-width: 640px) {
    row-gap: 0;
  }
`;

const Group = styled("div")`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-column-gap: 0px;
  grid-row-gap: 0px;
  @media (max-width: 640px) {
    grid-template-columns: repeat(1, 1fr);
  }
  column-gap: ${({ theme }) => theme.spacing(1)};
  width: 100%;
`;

const General = () => {
  return (
    <Root>
      <Group>
        <TextField label="Entry name" name="entryName" required={true} />
      </Group>

      <Group>
        <TextField label="Volume name" name="volumeName" required={true} />
      </Group>

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
