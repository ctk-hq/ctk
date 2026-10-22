import { TFinalFormField } from "../../../../types";
import { SuperForm } from "../../../SuperForm";

const General = () => {
  return (
    <div className="flex min-w-0 flex-col gap-4">
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
            id: "command",
            type: "command",
            name: "command",
            label: "Command"
          },
          {
            id: "entrypoint",
            type: "command",
            name: "entrypoint",
            label: "Entrypoint"
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
            id: "capAdd",
            type: "records",
            title: "Additional capabilities",
            name: "capAdd",
            fields: (index: number): TFinalFormField[] => [
              {
                id: `capAdd[${index}]`,
                type: "text",
                name: `capAdd[${index}]`,
                placeholder: "e.g. NET_ADMIN",
                required: true
              }
            ],
            newValue: ""
          },
          {
            id: "capDrop",
            type: "records",
            title: "Dropped capabilities",
            name: "capDrop",
            fields: (index: number): TFinalFormField[] => [
              {
                id: `capDrop[${index}]`,
                type: "text",
                name: `capDrop[${index}]`,
                placeholder: "e.g. NET_RAW",
                required: true
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
    </div>
  );
};

export default General;
