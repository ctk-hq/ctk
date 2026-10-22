import * as yup from "yup";
import type { IEditServiceForm, IServiceNodeItem } from "../../../../types";
import type {
  KubernetesServiceConfig,
  ServiceExposureForm
} from "../../../../types/service-exposure";
import { servicePorts } from "../../../../utils/service-ports";
import { serviceExposureIssues } from "../../../../services/service-exposure-validation";

export function exposureForm(node?: IServiceNodeItem): ServiceExposureForm {
  const settings = node?.kubernetes?.service;
  return {
    native: node?.kubernetes?.native ?? false,
    type: settings?.type ?? "",
    notice: node?.kubernetes?.serviceNotice ?? "",
    ports: (settings?.ports ?? servicePorts(node?.serviceConfig ?? {})).map(
      (port, index) => ({
        _sourceIndex: index,
        name: port.name ?? "",
        servicePort: String(port.port),
        targetPort: String(port.targetPort),
        protocol: port.protocol,
        nodePort: port.nodePort === undefined ? "" : String(port.nodePort),
        appProtocol: port.appProtocol ?? ""
      })
    )
  };
}

export function exposureConfig(
  form: ServiceExposureForm
): KubernetesServiceConfig | undefined {
  if (!form.type) return undefined;
  return {
    type: form.type,
    ports:
      form.type === "None"
        ? []
        : form.ports.map((port) => ({
            ...(port.name ? { name: port.name } : {}),
            port: Number(port.servicePort),
            targetPort: /^\d+$/.test(port.targetPort)
              ? Number(port.targetPort)
              : port.targetPort,
            protocol: port.protocol,
            ...(port.nodePort ? { nodePort: Number(port.nodePort) } : {}),
            ...(port.appProtocol ? { appProtocol: port.appProtocol } : {})
          }))
  };
}

export const exposureSchema = yup
  .mixed<ServiceExposureForm>()
  .test("exposure", function (raw) {
    if (!raw) return true;
    if (raw.native && !raw.type && !raw.notice)
      return this.createError({
        path: `${this.path}.type`,
        message:
          "Choose an explicit Kubernetes Service type for an imported workload."
      });
    const config = exposureConfig(raw);
    if (!config) return true;
    const issues = serviceExposureIssues(config);
    // Keep numeric input strict: Number() alone accepts exponent and hex syntax.
    raw.ports.forEach((port, index) => {
      if (raw.type === "None") return;
      for (const key of ["servicePort", "nodePort"] as const)
        if (
          (key === "servicePort" || port[key]) &&
          !/^\d+$/.test(port[key] ?? "")
        )
          issues.push({
            code: "PORT_INVALID",
            path: `/ports/${index}/${key}`,
            reason: "Use a whole port number."
          });
    });
    if (!issues.length) return true;
    return new yup.ValidationError(
      issues.map((issue) => {
        const path = issue.path
          .replace(/\/port$/, "/servicePort")
          .split("/")
          .filter(Boolean)
          .join(".");
        return this.createError({
          path: `${this.path}.${path}`,
          message: issue.reason
        });
      })
    );
  });

export function composePortValue(
  row: IEditServiceForm["ports"][number],
  original?: any
): any {
  if (original && typeof original === "object") {
    const next = {
      ...original,
      target: /^\d+$/.test(row.containerPort)
        ? Number(row.containerPort)
        : row.containerPort
    };
    for (const [field, value] of [
      ["published", row.hostPort],
      ["host_ip", row.hostIP],
      ["protocol", row.protocol]
    ]) {
      if (value) next[field!] = value;
      else delete next[field!];
    }
    return next;
  }
  const host = row.hostIP?.includes(":") ? `[${row.hostIP}]` : row.hostIP;
  return `${host ? `${host}:` : ""}${row.hostPort || host ? `${row.hostPort}:` : ""}${row.containerPort}${row.protocol ? `/${row.protocol}` : ""}`;
}
