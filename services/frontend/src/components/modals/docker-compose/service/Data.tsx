import { styled } from "@mui/material";
import Records from "../../../Records";

const Root = styled("div")`
  display: flex;
  flex-direction: column;
  row-gap: ${({ theme }) => theme.spacing(1)};
  @media (max-width: 640px) {
    row-gap: 0;
  }
`;

const Volumes = () => {
  return (
    <Root>
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
