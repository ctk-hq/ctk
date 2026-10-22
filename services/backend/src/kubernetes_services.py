"""Project unambiguous Kubernetes Services into target-specific editor settings.

Keep this projection aligned with frontend/utils/kubernetes-services.ts. Native
resources remain authoritative, including fields that have no form controls.
"""

import copy


def workload_template(resource):
    if resource.get("kind") == "Pod":
        return resource
    if resource.get("kind") == "CronJob":
        return (
            resource.get("spec", {})
            .get("jobTemplate", {})
            .get("spec", {})
            .get("template")
        )
    if resource.get("kind") in {
        "Deployment",
        "StatefulSet",
        "DaemonSet",
        "ReplicaSet",
        "ReplicationController",
        "Job",
    }:
        return resource.get("spec", {}).get("template")
    return None


def selects_workload(service, workload):
    selector = service.get("spec", {}).get("selector")
    labels = (workload_template(workload) or {}).get("metadata", {}).get("labels", {})
    return (
        service.get("kind") == "Service"
        and (service.get("metadata", {}).get("namespace") or "default")
        == (workload.get("metadata", {}).get("namespace") or "default")
        and bool(selector)
        and all(labels.get(key) == value for key, value in selector.items())
    )


def bind_kubernetes_services(documents, bindings):
    for binding in bindings:
        workload = documents[binding["documentIndex"]]
        matching = [
            (index, resource)
            for index, resource in enumerate(documents)
            if selects_workload(resource, workload)
        ]
        selected = matching[0] if matching else None
        ambiguous = (
            len(
                (workload_template(workload) or {})
                .get("spec", {})
                .get("containers", [])
            )
            != 1
            or len(matching) > 1
            or any(
                sum(
                    bool(workload_template(candidate))
                    and selects_workload(resource, candidate)
                    for candidate in documents
                )
                != 1
                for _, resource in matching
            )
        )
        if ambiguous or (
            selected
            and (
                selected[1]["spec"].get("type", "ClusterIP")
                not in {"ClusterIP", "NodePort", "LoadBalancer"}
                or selected[1]["spec"].get("clusterIP") == "None"
            )
        ):
            binding["serviceNotice"] = (
                "This workload has shared, multiple or advanced Services. Edit their exposure in the Kubernetes manifest."
            )
            continue
        if not selected:
            binding["service"] = {"config": {"type": "None", "ports": []}}
            continue
        index, service = selected
        ports = []
        for port in service["spec"].get("ports", []):
            item = {
                "port": port.get("port"),
                "targetPort": port.get("targetPort", port.get("port")),
                "protocol": port.get("protocol", "TCP"),
            }
            for key in ("name", "appProtocol"):
                if key in port:
                    item[key] = port[key]
            if port.get("nodePort"):
                item["nodePort"] = port["nodePort"]
            ports.append(item)
        binding["service"] = {
            "documentIndex": index,
            "config": {
                "type": service["spec"].get("type", "ClusterIP"),
                "ports": copy.deepcopy(ports),
            },
        }
