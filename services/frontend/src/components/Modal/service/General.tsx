import { styled } from "@mui/joy";
import TextField from "../../global/FormElements/TextField";
import Records from "../../Records";

const Root = styled("div")`
  display: flex;
  flex-direction: column;
  row-gap: ${({ theme }) => theme.spacing(1)};
`;

const ImageNameGroup = styled("div")`
  display: flex;
  flex-direction: row;
  @media (max-width: 640px) {
    flex-direction: column;
  }
  column-gap: ${({ theme }) => theme.spacing(1)};
  width: 100%;
`;

const General = () => {
  return (
    <Root>
      <TextField label="Service name" name="serviceName" required={true} />
      <ImageNameGroup>
        <TextField label="Image name" name="imageName" required={true} />
        <TextField label="Image tag" name="imageTag" />
      </ImageNameGroup>
      <TextField label="Container name" name="containerName" required={true} />

      <Records
        name="ports"
        modal="service"
        title="Ports"
        referred="port"
        fields={(index: number) => [
          {
            name: `ports[${index}].hostPort`,
            placeholder: "Host Port",
            required: true,
            type: "text"
          },
          {
            name: `ports[${index}].containerPort`,
            placeholder: "Container Port",
            type: "text"
          },
          {
            name: `ports[${index}].protocol`,
            placeholder: "Protocol",
            type: "toggle",
            options: [
              {
                value: "tcp",
                text: "TCP"
              },
              {
                value: "udp",
                text: "UDP"
              }
            ]
          }
        ]}
        newValue={{
          hostPort: "",
          containerPort: "",
          protocol: ""
        }}
      />
    </Root>
  );
};

export default General;
