import { ErrorMessage, useFormikContext } from "formik";
import type { IEditServiceForm, TFinalFormField } from "../../../../types";
import type { ServiceExposureForm } from "../../../../types/service-exposure";
import { SuperForm } from "../../../SuperForm";
import { Label } from "../../../ui/label";
import { composePortValue, exposureForm } from "./networking-form";

const protocols = (upper = false) =>
  ["TCP", "UDP", "SCTP"].map((text) => ({
    text,
    value: upper ? text : text.toLowerCase()
  }));
const text = (name: string, label: string, help?: string): TFinalFormField => ({
  id: name,
  type: "text",
  name,
  label,
  help
});

export default function Networking() {
  const formik = useFormikContext<IEditServiceForm>();
  const exposure = formik.values.kubernetesService;
  const external =
    exposure.type === "NodePort" || exposure.type === "LoadBalancer";
  const changeType = (type: ServiceExposureForm["type"]) => {
    let ports = exposure.ports;
    if (!ports.length && type && type !== "None") {
      ports = exposureForm({
        serviceConfig: {
          ports: formik.values.ports.map((port) => composePortValue(port)),
          expose: formik.values.exposedPorts.map(
            (port) =>
              `${port.containerPort}${port.protocol ? `/${port.protocol}` : ""}`
          )
        }
      } as any).ports;
    }
    if (type === "ClusterIP")
      ports = ports.map((port) => ({ ...port, nodePort: "" }));
    formik.setFieldValue("kubernetesService", { ...exposure, type, ports });
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <section className="space-y-3" aria-label="Compose networking">
        <h3 className="text-sm font-medium">Compose bindings</h3>
        <p className="text-sm text-muted-foreground">
          Publish container ports on the Docker host. Leave the host port blank
          for automatic allocation. Host IP is optional.
        </p>
        <SuperForm
          fields={[
            {
              id: "ports",
              type: "records",
              name: "ports",
              title: "Published ports",
              defaultOpen: true,
              layout: "grid",
              fields: (index) => [
                text(`ports[${index}].containerPort`, "Container port"),
                text(`ports[${index}].hostPort`, "Host port"),
                text(`ports[${index}].hostIP`, "Host IP"),
                {
                  id: `ports[${index}].protocol`,
                  type: "toggle",
                  name: `ports[${index}].protocol`,
                  label: "Protocol",
                  options: protocols()
                }
              ],
              newValue: {
                hostIP: "",
                hostPort: "",
                containerPort: "",
                protocol: "tcp"
              }
            },
            {
              id: "exposedPorts",
              type: "records",
              name: "exposedPorts",
              title: "Internal container ports",
              defaultOpen: true,
              fields: (index) => [
                text(`exposedPorts[${index}].containerPort`, "Internal port"),
                {
                  id: `exposedPorts[${index}].protocol`,
                  type: "toggle",
                  name: `exposedPorts[${index}].protocol`,
                  label: "Protocol",
                  options: protocols()
                }
              ],
              newValue: { containerPort: "", protocol: "tcp" }
            }
          ]}
        />
        <p className="text-xs text-muted-foreground">
          Internal ports are declared without a host binding. They do not
          enforce network isolation.
        </p>
      </section>
      <section className="space-y-3" aria-label="Kubernetes exposure">
        {exposure.notice ? (
          <h3 className="text-sm font-medium">Kubernetes Service</h3>
        ) : (
          <Label htmlFor="kubernetes-service-type">Kubernetes Service</Label>
        )}
        {exposure.notice ? (
          <p className="text-sm text-muted-foreground">{exposure.notice}</p>
        ) : (
          <>
            <select
              id="kubernetes-service-type"
              name="kubernetesService.type"
              value={exposure.type}
              onChange={(event) =>
                changeType(event.target.value as ServiceExposureForm["type"])
              }
              onBlur={formik.handleBlur}
              aria-describedby="kubernetes-service-help"
              className="h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {!exposure.native && (
                <option value="">Automatic · internal ClusterIP</option>
              )}
              <option value="None">No Service</option>
              <option value="ClusterIP">ClusterIP · inside the cluster</option>
              <option value="NodePort">
                NodePort · through node addresses
              </option>
              <option value="LoadBalancer">
                LoadBalancer · through a cluster provider
              </option>
            </select>
            <p
              id="kubernetes-service-help"
              className="text-sm text-muted-foreground"
            >
              {!exposure.type
                ? "Uses Compose ports as internal Service ports. Choose an explicit type to configure Kubernetes ports separately."
                : exposure.type === "None"
                  ? "Declare container ports without creating a Kubernetes Service."
                  : exposure.type === "ClusterIP"
                    ? "Reachable inside the cluster through its Service name and port."
                    : exposure.type === "NodePort"
                      ? "Requires reachable node addresses and firewall access. Leave node ports blank for cluster allocation."
                      : "Requires a load balancer provider in the cluster. Provisioning an address may incur provider charges."}
            </p>
            {exposure.type && exposure.type !== "None" && (
              <>
                <SuperForm
                  fields={[
                    {
                      id: "kubernetesService.ports",
                      type: "records",
                      name: "kubernetesService.ports",
                      title: "Service ports",
                      defaultOpen: true,
                      layout: "grid",
                      fields: (index) => [
                        text(
                          `kubernetesService.ports[${index}].name`,
                          "Port name",
                          "Required when the Service has multiple ports."
                        ),
                        text(
                          `kubernetesService.ports[${index}].servicePort`,
                          "Service port"
                        ),
                        text(
                          `kubernetesService.ports[${index}].targetPort`,
                          "Target port",
                          "Container port number, or an existing native container port name."
                        ),
                        {
                          id: `kubernetesService.ports[${index}].protocol`,
                          type: "toggle",
                          name: `kubernetesService.ports[${index}].protocol`,
                          label: "Protocol",
                          options: protocols(true)
                        },
                        ...(external
                          ? [
                              text(
                                `kubernetesService.ports[${index}].nodePort`,
                                "Node port",
                                "Optional; must be in your cluster's configured range."
                              )
                            ]
                          : []),
                        text(
                          `kubernetesService.ports[${index}].appProtocol`,
                          "Application protocol",
                          "Optional, for example http or kubernetes.io/h2c."
                        )
                      ],
                      newValue: {
                        name: "",
                        servicePort: "",
                        targetPort: "",
                        protocol: "TCP",
                        nodePort: "",
                        appProtocol: ""
                      }
                    }
                  ]}
                />
                <ErrorMessage
                  name="kubernetesService.ports"
                  render={(error) =>
                    typeof error === "string" ? (
                      <p role="alert" className="text-xs text-destructive">
                        {error}
                      </p>
                    ) : null
                  }
                />
              </>
            )}
          </>
        )}
      </section>
      <SuperForm
        fields={[
          {
            id: "networks",
            type: "records",
            name: "networks",
            title: "Compose networks",
            fields: (index) => [text(`networks[${index}]`, "Network name")],
            newValue: ""
          }
        ]}
      />
    </div>
  );
}
