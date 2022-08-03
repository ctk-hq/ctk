import { styled } from "@mui/joy";
import { useParams } from "react-router-dom";
import TextField from "../../global/FormElements/TextField";
import Toggle from "../../global/FormElements/Toggle";
import Records from "../../Records";
import Accordion from "./Accordion";

const Root = styled("div")`
  display: flex;
  flex-direction: column;
  row-gap: ${({ theme }) => theme.spacing(1)};
`;

const Group = styled("div")`
  display: flex;
  flex-direction: row;
  @media (max-width: 640px) {
    flex-direction: column;
  }
  column-gap: ${({ theme }) => theme.spacing(1)};
  width: 100%;
`;

const Deploy = () => {
  const { uuid } = useParams<{ uuid: string }>();
  return (
    <Root>
      <Toggle
        name="deploy.mode"
        label="Mode"
        options={[
          {
            value: "global",
            text: "Global"
          },
          {
            value: "replicated",
            text: "Replicated"
          }
        ]}
      />

      <TextField label="Replicas" name="deploy.replicas" />

      <Toggle
        name="deploy.endpointMode"
        label="Endpoint mode"
        options={[
          {
            value: "vip",
            text: "Virtual IP"
          },
          {
            value: "dnsrr",
            text: "DNS Round-Robin"
          }
        ]}
      />

      <Records
        name="deploy.placement.constraints"
        title="Placement constraints"
        fields={(index: number) => [
          {
            name: `deploy.placement.constraints[${index}].key`,
            placeholder: "Key",
            required: true,
            type: "text"
          },
          {
            name: `deploy.placement.constraints[${index}].value`,
            placeholder: "Value",
            type: "text"
          }
        ]}
        newValue={{
          key: "",
          value: ""
        }}
      />

      <Records
        name="deploy.placement.preferences"
        title="Placement preferences"
        fields={(index: number) => [
          {
            name: `deploy.placement.preferences[${index}].key`,
            placeholder: "Key",
            required: true,
            type: "text"
          },
          {
            name: `deploy.placement.preferences[${index}].value`,
            placeholder: "Value",
            type: "text"
          }
        ]}
        newValue={{
          key: "",
          value: ""
        }}
      />

      <Accordion id={`${uuid}.deploy.resources.limits`} title="Resource limits">
        <Group>
          <TextField label="CPUs" name="deploy.resources.limits.cpus" />
          <TextField label="Memory" name="deploy.resources.limits.memory" />
          <TextField label="PIDs" name="deploy.resources.limits.pids" />
        </Group>
      </Accordion>

      <Accordion
        id={`${uuid}.deploy.resources.reservations`}
        title="Resource reservations"
      >
        <Group>
          <TextField label="CPUs" name="deploy.resources.reservations.cpus" />
          <TextField
            label="Memory"
            name="deploy.resources.reservations.memory"
          />
        </Group>

        {/* TODO: devices */}
      </Accordion>

      <Accordion id={`${uuid}.deploy.restartPolicy`} title="Restart policy">
        <Toggle
          name="deploy.restartPolicy.condition"
          label="Condition"
          options={[
            {
              value: "none",
              text: "None"
            },
            {
              value: "on-failure",
              text: "On-failure"
            },
            {
              value: "any",
              text: "Any"
            }
          ]}
        />
        <Group>
          <TextField label="Delay" name="deploy.restartPolicy.delay" />
          <TextField
            label="Max attempts"
            name="deploy.restartPolicy.maxAttempts"
          />
          <TextField label="Window" name="deploy.restartPolicy.window" />
        </Group>
      </Accordion>

      <Accordion id={`${uuid}.deploy.rollbackConfig`} title="Rollback config">
        <TextField
          label="Parallelism"
          name="deploy.rollbackConfig.parallelism"
        />

        <TextField label="Delay" name="deploy.rollbackConfig.delay" />

        <Toggle
          name="deploy.rollbackConfig.failureAction"
          label="Failure action"
          options={[
            {
              value: "continue",
              text: "Continue"
            },
            {
              value: "pause",
              text: "Pause"
            }
          ]}
        />

        <TextField label="Monitor" name="deploy.rollbackConfig.monitor" />

        <TextField
          label="Max failure ratio"
          name="deploy.rollbackConfig.maxFailureRatio"
        />

        <Toggle
          name="deploy.rollbackConfig.order"
          label="Order"
          options={[
            {
              value: "stop-first",
              text: "Stop first"
            },
            {
              value: "start-first",
              text: "Start first"
            }
          ]}
        />
      </Accordion>

      <Records
        name="deploy.labels"
        title="Labels"
        fields={(index: number) => [
          {
            name: `deploy.labels[${index}].key`,
            placeholder: "Key",
            required: true,
            type: "text"
          },
          {
            name: `deploy.labels[${index}].value`,
            placeholder: "Value",
            type: "text"
          }
        ]}
        newValue={{ key: "", value: "" }}
      />
    </Root>
  );
};

export default Deploy;
