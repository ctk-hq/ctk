import { styled } from "@mui/material";
import { TFinalFormField } from "../../../../types";
import { SuperForm } from "../../../SuperForm";

const Root = styled("div")`
  display: flex;
  flex-direction: column;
  row-gap: ${({ theme }) => theme.spacing(1)};
  @media (max-width: 640px) {
    row-gap: 0;
  }
`;

const General = () => {
  return (
    <Root>
      <SuperForm
        fields={[
          {
            id: "row1",
            type: "grid-row",
            fields: [
              {
                id: "serviceName",
                type: "text",
                name: "serviceName",
                label: "Service name",
                required: true
              }
            ]
          },
          {
            id: "row2",
            type: "grid-row",
            fields: [
              {
                id: "imageName",
                type: "text",
                name: "imageName",
                label: "Image name"
              },
              {
                id: "imageTag",
                type: "text",
                name: "imageTag",
                label: "Image tag"
              }
            ]
          },
          {
            id: "row3",
            type: "grid-row",
            fields: [
              {
                id: "containerName",
                type: "text",
                name: "containerName",
                label: "Container name"
              }
            ]
          },
          {
            id: "row4",
            type: "grid-row",
            fields: [
              {
                id: "row4-column1",
                type: "grid-column",
                spans: [2, 3],
                fields: [
                  {
                    id: "command",
                    type: "text",
                    name: "command",
                    label: "Command"
                  }
                ]
              }
            ]
          },
          {
            id: "row5",
            type: "grid-row",
            fields: [
              {
                id: "row5-column1",
                type: "grid-column",
                spans: [2, 3],
                fields: [
                  {
                    id: "entrypoint",
                    type: "text",
                    name: "entrypoint",
                    label: "Entrypoint"
                  }
                ]
              }
            ]
          },
          {
            id: "row6",
            type: "grid-row",
            fields: [
              {
                id: "row6-column1",
                type: "grid-column",
                spans: [2, 3],
                fields: [
                  {
                    id: "envFile",
                    type: "text",
                    name: "envFile",
                    label: "Env file"
                  }
                ]
              }
            ]
          },
          {
            id: "row7",
            type: "grid-row",
            fields: [
              {
                id: "row7-column1",
                type: "grid-column",
                spans: [2, 3],
                fields: [
                  {
                    id: "workingDir",
                    type: "text",
                    name: "workingDir",
                    label: "Working directory"
                  }
                ]
              }
            ]
          },
          {
            id: "row8",
            type: "grid-row",
            fields: [
              {
                id: "row8-column1",
                type: "grid-column",
                spans: [2, 3],
                fields: [
                  {
                    id: "restart",
                    type: "toggle",
                    name: "restart",
                    label: "Restart Policy",
                    options: [
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
                    ]
                  }
                ]
              }
            ]
          },
          {
            id: "ports",
            type: "records",
            name: "ports",
            title: "Ports",
            defaultOpen: true,
            fields: (index: number): TFinalFormField[] => [
              {
                id: `ports[${index}].hostPort`,
                type: "text",
                name: `ports[${index}].hostPort`,
                placeholder: "Host port",
                required: true
              },
              {
                id: `ports[${index}].containerPort`,
                type: "text",
                name: `ports[${index}].containerPort`,
                placeholder: "Container port"
              },
              {
                id: `ports[${index}].protocol`,
                type: "toggle",
                name: `ports[${index}].protocol`,
                label: "Protocol",
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
            ],
            newValue: {
              hostPort: "",
              containerPort: "",
              protocol: ""
            }
          },
          {
            id: "dependsOn",
            type: "records",
            name: "dependsOn",
            title: "Depends on",
            fields: (index: number): TFinalFormField[] => [
              {
                id: `dependsOn[${index}].serviceName`,
                type: "text",
                name: `dependsOn[${index}].serviceName`,
                placeholder: "Service name",
                required: true
              },
              {
                id: `dependsOn[${index}].condition`,
                type: "toggle",
                name: `dependsOn[${index}].condition`,
                label: "Condition",
                required: true,
                options: [
                  {
                    value: "service_started",
                    text: "Service started"
                  },
                  {
                    value: "service_healthy",
                    text: "Service healthy"
                  },
                  {
                    value: "service_completed_successfully",
                    text: "Service completed successfully"
                  }
                ]
              }
            ],
            newValue: {
              serviceName: "",
              condition: "service_started"
            }
          },
          {
            id: "networks",
            type: "records",
            title: "Networks",
            name: "networks",
            fields: (index: number): TFinalFormField[] => [
              {
                id: `networks[${index}]`,
                type: "text",
                name: `networks[${index}]`,
                placeholder: "Network name",
                required: false
              }
            ],
            newValue: ""
          },
          {
            id: "labels",
            type: "records",
            title: "Labels",
            name: "labels",
            fields: (index: number): TFinalFormField[] => [
              {
                id: `labels[${index}].key`,
                type: "text",
                name: `labels[${index}].key`,
                placeholder: "Key",
                required: true
              },
              {
                id: `labels[${index}].value`,
                type: "text",
                name: `labels[${index}].value`,
                placeholder: "Value",
                required: true
              }
            ],
            newValue: { key: "", value: "" }
          },
          {
            id: "profiles",
            type: "records",
            title: "Profiles",
            name: "profiles",
            fields: (index: number): TFinalFormField[] => [
              {
                id: `profiles[${index}]`,
                name: `profiles[${index}]`,
                placeholder: "Name",
                required: true,
                type: "text"
              }
            ],
            newValue: ""
          }
        ]}
      />
    </Root>
  );
};

export default General;
