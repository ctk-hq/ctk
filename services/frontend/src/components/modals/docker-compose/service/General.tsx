import { styled } from "@mui/joy";
import TextField from "../../../global/FormElements/TextField";
import Toggle from "../../../global/FormElements/Toggle";
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

const SpanTwo = styled("div")`
  grid-column: span 2;
  @media (max-width: 640px) {
    grid-column: span 3;
  }
`;

const General = () => {
  return (
    <Root>
      <Group>
        <TextField label="Service name" name="serviceName" required={true} />
      </Group>

      <Group>
        <TextField label="Image name" name="imageName" required={false} />
        <TextField label="Image tag" name="imageTag" />
      </Group>

      <Group>
        <TextField
          label="Container name"
          name="containerName"
          required={false}
        />
      </Group>

      <Group>
        <SpanTwo>
          <TextField label="Command" name="command" required={false} />
        </SpanTwo>
      </Group>

      <Group>
        <SpanTwo>
          <TextField label="Entrypoint" name="entrypoint" required={false} />
        </SpanTwo>
      </Group>

      <Group>
        <TextField label="Env file" name="envFile" required={false} />
      </Group>

      <Group>
        <SpanTwo>
          <TextField
            label="Working directory"
            name="workingDir"
            required={false}
          />
        </SpanTwo>
      </Group>

      <Group>
        <SpanTwo>
          <Toggle
            name="restart"
            label="Restart policy"
            options={[
              {
                value: "no",
                text: "no"
              },
              {
                value: "always",
                text: "always"
              },
              {
                value: "on-failure",
                text: "on-failure"
              },
              {
                value: "unless-stopped",
                text: "unless-stopped"
              }
            ]}
          />
        </SpanTwo>
      </Group>

      <Records
        name="ports"
        title="Ports"
        defaultOpen={true}
        fields={(index: number) => [
          {
            name: `ports[${index}].hostPort`,
            placeholder: "Host port",
            required: true,
            type: "text"
          },
          {
            name: `ports[${index}].containerPort`,
            placeholder: "Container port",
            type: "text"
          },
          {
            name: `ports[${index}].protocol`,
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

      <Records
        name="dependsOn"
        title="Depends on"
        fields={(index: number) => [
          {
            name: `dependsOn[${index}]`,
            placeholder: "Service name",
            required: false,
            type: "text"
          }
        ]}
        newValue={""}
      />

      <Records
        name="networks"
        title="Networks"
        fields={(index: number) => [
          {
            name: `networks[${index}]`,
            placeholder: "Network name",
            required: false,
            type: "text"
          }
        ]}
        newValue={""}
      />

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

      <Records
        name="profiles"
        title="Profiles"
        fields={(index: number) => [
          {
            name: `profiles[${index}]`,
            placeholder: "Name",
            required: true,
            type: "text"
          }
        ]}
        newValue={""}
      />
    </Root>
  );
};

export default General;
