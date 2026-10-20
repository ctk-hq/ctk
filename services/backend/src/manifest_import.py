"""Loss-preserving URL imports using the browser's project/source contract."""

import copy
import re
import uuid
from decimal import Decimal
from typing import Any

from ruamel.yaml import YAML


def _list(value):
    return value if isinstance(value, list) else []


def _record(value):
    return value if isinstance(value, dict) else {}


def _dollars(value):
    if isinstance(value, str):
        return value.replace("$", "$$")
    if isinstance(value, list):
        return [_dollars(item) for item in value]
    if isinstance(value, dict):
        return {key: _dollars(item) for key, item in value.items()}
    return value


def _template(resource):
    api, kind = resource.get("apiVersion"), resource.get("kind")
    if api == "v1" and kind == "Pod":
        return resource
    if (
        (
            api == "apps/v1"
            and kind in {"Deployment", "StatefulSet", "DaemonSet", "ReplicaSet"}
        )
        or (api == "batch/v1" and kind == "Job")
        or (api == "v1" and kind == "ReplicationController")
    ):
        return resource.get("spec", {}).get("template")
    if api == "batch/v1" and kind == "CronJob":
        return (
            resource.get("spec", {})
            .get("jobTemplate", {})
            .get("spec", {})
            .get("template")
        )
    return None


def _quantity(value, memory=False):
    if value is None:
        return None
    text = str(value)
    if not memory:
        if re.fullmatch(r"\d+(?:\.\d+)?m", text):
            return format((Decimal(text[:-1]) / 1000).normalize(), "f")
        return text if re.fullmatch(r"\d+(?:\.\d+)?", text) else None
    match = re.fullmatch(r"(\d+(?:\.\d+)?)([EPTGMK]i?|k)?", text)
    if not match:
        return None
    suffix = match[2] or ""
    exponent = "KMGTPE".find(suffix[:1].upper()) + 1 if suffix else 0
    size = Decimal(match[1]) * (1024 if suffix.endswith("i") else 1000) ** exponent
    return str(int(size)) if size == int(size) and size <= 9007199254740991 else None


def import_manifest(text: str) -> dict[str, Any]:
    parser = YAML(typ="safe")
    parser.allow_duplicate_keys = False
    parser.constructor.add_constructor(
        "tag:yaml.org,2002:timestamp",
        lambda loader, node: loader.construct_scalar(node),
    )
    try:
        documents = [
            document for document in parser.load_all(text) if document is not None
        ]
    except Exception as error:
        raise ValueError(
            "Invalid YAML. Correct the manifest before importing."
        ) from error
    if (
        len(documents) == 1
        and isinstance(documents[0], list)
        and text.lstrip().startswith("[")
    ):
        documents = documents[0]
    if not documents or any(not isinstance(document, dict) for document in documents):
        raise ValueError("Expected a Compose document or Kubernetes resource objects.")
    if any("apiVersion" in document or "kind" in document for document in documents):
        try:
            data, source = _kubernetes(documents)
        except (AttributeError, KeyError, TypeError, RecursionError) as error:
            raise ValueError(
                "Invalid Kubernetes container or resource structure."
            ) from error
    else:
        if len(documents) != 1:
            raise ValueError("Compose import needs one document.")
        document = documents[0]
        reserved = {
            "version",
            "name",
            "networks",
            "volumes",
            "configs",
            "secrets",
            "include",
        }
        services = document.get("services")
        legacy = None
        if services is None:
            legacy = {
                key: value
                for key, value in document.items()
                if key not in reserved and not key.startswith("x-")
            }
            if not legacy or any(
                not isinstance(value, dict)
                or not ("image" in value or "build" in value)
                for value in legacy.values()
            ):
                raise ValueError("Compose needs a services object.")
            services = legacy
        if not isinstance(services, dict) or any(
            not isinstance(value, dict) for value in services.values()
        ):
            raise ValueError("Compose services must contain configuration objects.")
        data = {
            "services": services,
            "volumes": document.get("volumes") or {},
            "networks": document.get("networks") or {},
        }
        for section in ("volumes", "networks"):
            if not isinstance(data[section], dict) or any(
                value is not None and not isinstance(value, dict)
                for value in data[section].values()
            ):
                raise ValueError(
                    f"Compose {section} must contain named configuration objects."
                )
        compose = {
            key: value
            for key, value in document.items()
            if key not in {"version", "services", "volumes", "networks"}
            and (legacy is None or key not in legacy)
        }
        native = [key for key in compose if key != "name" and not key.startswith("x-")]
        source = {
            "compose": compose,
            "warnings": (
                [
                    f"Compose sections {', '.join(native)} are preserved in Compose; they are not translated to Kubernetes."
                ]
                if native
                else []
            ),
        }
    canvas = {
        "position": {"top": 0, "left": 0, "scale": 1},
        "nodes": {},
        "connections": [],
        "networks": {},
        "manifestSource": source,
    }
    service_ids, volume_ids = {}, {}
    for section, kind, config_key, ids in [
        ("services", "SERVICE", "serviceConfig", service_ids),
        ("volumes", "VOLUME", "volumeConfig", volume_ids),
        ("networks", "NETWORK", "networkConfig", {}),
    ]:
        for name, config in data[section].items():
            key = f"{kind.lower()}-{uuid.uuid4()}"
            ids[name] = key
            config = copy.deepcopy(config or {})
            if section == "networks":
                config.setdefault("name", name)
            node = {
                "key": key,
                "type": kind,
                "position": {
                    "left": 100 + len(canvas["nodes"]) % 3 * 280,
                    "top": 100 + len(canvas["nodes"]) // 3 * 180,
                },
                "inputs": [],
                "outputs": [f"op_{key}"],
                "canvasConfig": {"node_name": name},
                config_key: config,
            }
            canvas["networks" if section == "networks" else "nodes"][key] = node
    for name, config in data["services"].items():
        dependencies = config.get("depends_on", []) or []
        for dependency in dependencies:
            if dependency in service_ids:
                canvas["connections"].append(
                    [service_ids[name], service_ids[dependency]]
                )
        for mount in _list(config.get("volumes")):
            source_name = (
                mount.split(":", 1)[0]
                if isinstance(mount, str) and ":" in mount
                else (
                    mount.get("source")
                    if isinstance(mount, dict)
                    and mount.get("type", "volume") == "volume"
                    else None
                )
            )
            if source_name in volume_ids:
                edge = [volume_ids[source_name], service_ids[name]]
                if edge not in canvas["connections"]:
                    canvas["connections"].append(edge)
    for binding in source.get("kubernetes", {}).get("bindings", []):
        binding["nodeKey"] = service_ids[binding["serviceName"]]
    return {"canvas": canvas}


def _kubernetes(input_documents):
    documents = []

    def expand(resource):
        if resource.get("apiVersion") == "v1" and resource.get("kind") == "List":
            if not isinstance(resource.get("items"), list):
                raise ValueError("Kubernetes List needs an items array.")
            for item in resource["items"]:
                expand(_record(item))
        else:
            documents.append(resource)

    for resource in input_documents:
        expand(resource)
    identities = set()
    for resource in documents:
        if (
            not all(
                isinstance(resource.get(key), str) and resource[key]
                for key in ("apiVersion", "kind")
            )
            or not isinstance(resource.get("metadata", {}).get("name"), str)
            or not resource["metadata"]["name"]
        ):
            raise ValueError(
                "Every Kubernetes resource needs apiVersion, kind, and metadata.name."
            )
        identity = (
            resource["apiVersion"].split("/")[0],
            resource["kind"],
            resource["metadata"].get("namespace") or "default",
            resource["metadata"]["name"],
        )
        if identity in identities:
            raise ValueError("Duplicate Kubernetes resource identity.")
        identities.add(identity)
    if not documents:
        raise ValueError("The Kubernetes resource list is empty.")
    data = {"services": {}, "volumes": {}, "networks": {}}
    bindings, claims = [], {}
    warnings = [
        "Kubernetes resources and settings are preserved in Kubernetes. Compose contains the mapped container settings; review it before running."
    ]

    def warn(message):
        if message not in warnings:
            warnings.append(message)

    def unique(requested, used):
        name = re.sub(r"[^a-zA-Z0-9_.-]", "-", requested) or "app"
        candidate, suffix = name, 2
        while candidate in used:
            candidate, suffix = f"{name}-{suffix}", suffix + 1
        return candidate

    def claim(name, namespace):
        identity = f"{namespace}/{name}"
        if identity not in claims:
            logical = unique(name, data["volumes"])
            claims[identity] = logical
            data["volumes"][logical] = {"name": name, "external": True}
        return claims[identity]

    storage_warning = "PersistentVolumeClaims become external Compose volumes. Provision their data separately; Kubernetes storage settings stay in Kubernetes."
    for resource in documents:
        if (
            resource["apiVersion"] == "v1"
            and resource["kind"] == "PersistentVolumeClaim"
        ):
            claim(
                resource["metadata"]["name"],
                resource["metadata"].get("namespace") or "default",
            )
            warn(storage_warning)
    for document_index, resource in enumerate(documents):
        template = _template(resource)
        if template is None:
            if resource["kind"] not in {"Service", "PersistentVolumeClaim"}:
                warn(
                    f'{resource["kind"]}/{resource["metadata"]["name"]} is preserved in Kubernetes and has no graph node or Compose translation.'
                )
            continue
        pod = _record(template.get("spec"))
        containers = _list(pod.get("containers"))
        if not containers:
            raise ValueError("A Kubernetes workload needs at least one container.")
        if len(containers) > 1:
            warn(
                f'{resource["metadata"]["name"]} has multiple containers. Compose creates separate services without Kubernetes Pod sharing.'
            )
        if resource["kind"] not in {"Deployment", "Pod"}:
            warn(
                f'{resource["kind"]} lifecycle and scheduling stay in Kubernetes; Compose services do not reproduce them.'
            )
        if pod.get("initContainers"):
            warn(
                "Init containers are preserved in Kubernetes and are not translated to Compose services."
            )
        for container_index, container in enumerate(containers):
            if (
                not isinstance(container, dict)
                or not isinstance(container.get("name"), str)
                or not isinstance(container.get("image"), str)
                or not container["image"].strip()
            ):
                raise ValueError("Each Kubernetes container needs a name and image.")
            name = unique(
                (
                    resource["metadata"]["name"]
                    if len(containers) == 1
                    else f'{resource["metadata"]["name"]}-{container["name"]}'
                ),
                data["services"],
            )
            config = {"image": container["image"]}
            for native, compose in [
                ("command", "entrypoint"),
                ("args", "command"),
                ("workingDir", "working_dir"),
                ("stdin", "stdin_open"),
                ("tty", "tty"),
            ]:
                if native in container:
                    config[compose] = copy.deepcopy(container[native])
            environment = {
                entry["name"]: str(entry["value"])
                for entry in _list(container.get("env"))
                if isinstance(entry.get("name"), str) and "value" in entry
            }
            if environment:
                config["environment"] = environment
            if any(
                entry.get("valueFrom") for entry in _list(container.get("env"))
            ) or container.get("envFrom"):
                warn(
                    "Environment references to Secrets, ConfigMaps, or Pod fields stay in Kubernetes; supply those values separately for Compose."
                )
            ports = [
                f'{port["containerPort"]}'
                + (
                    f'/{port["protocol"].lower()}'
                    if port.get("protocol", "TCP") != "TCP"
                    else ""
                )
                for port in _list(container.get("ports"))
                if type(port.get("containerPort")) is int
                and 0 < port["containerPort"] <= 65535
            ]
            if ports:
                config["expose"] = ports
            security = _record(container.get("securityContext"))
            for native, compose in [
                ("runAsUser", "user"),
                ("privileged", "privileged"),
                ("readOnlyRootFilesystem", "read_only"),
            ]:
                if native in security:
                    config[compose] = (
                        str(security[native])
                        if native == "runAsUser"
                        else security[native]
                    )
            if "runAsUser" in security and "runAsGroup" in security:
                config["user"] = f'{security["runAsUser"]}:{security["runAsGroup"]}'
            for native, compose in [("add", "cap_add"), ("drop", "cap_drop")]:
                if native in security.get("capabilities", {}):
                    config[compose] = security["capabilities"][native]
            resources = {}
            for native, compose in [("limits", "limits"), ("requests", "reservations")]:
                values = _record(container.get("resources", {}).get(native))
                mapped = {
                    key: value
                    for key, value in {
                        "cpus": _quantity(values.get("cpu")),
                        "memory": _quantity(values.get("memory"), True),
                    }.items()
                    if value is not None
                }
                if mapped:
                    resources[compose] = mapped
            if resources:
                config["deploy"] = {"resources": resources}
            if "replicas" in resource.get("spec", {}):
                config.setdefault("deploy", {})["replicas"] = resource["spec"][
                    "replicas"
                ]
            if pod.get("hostNetwork") is True:
                config["network_mode"] = "host"
            if pod.get("dnsConfig", {}).get("nameservers"):
                config["dns"] = pod["dnsConfig"]["nameservers"]
            mounts = []
            for mount in _list(container.get("volumeMounts")):
                volume = next(
                    (
                        volume
                        for volume in _list(pod.get("volumes"))
                        if volume.get("name") == mount.get("name")
                    ),
                    None,
                )
                if not volume or any(
                    mount.get(key)
                    for key in ("subPath", "subPathExpr", "mountPropagation")
                ):
                    warn(
                        "Some volume mounts have Kubernetes-only settings and stay in Kubernetes."
                    )
                    continue
                item = {
                    "target": mount.get("mountPath"),
                    "read_only": mount.get("readOnly") is True,
                }
                if volume.get("persistentVolumeClaim", {}).get("claimName"):
                    item.update(
                        type="volume",
                        source=claim(
                            volume["persistentVolumeClaim"]["claimName"],
                            resource["metadata"].get("namespace") or "default",
                        ),
                    )
                    item["read_only"] = (
                        item["read_only"]
                        or volume["persistentVolumeClaim"].get("readOnly") is True
                    )
                    warn(storage_warning)
                elif volume.get("hostPath", {}).get("path"):
                    item.update(type="bind", source=volume["hostPath"]["path"])
                elif "emptyDir" in volume:
                    memory = volume["emptyDir"].get("medium") == "Memory"
                    item["type"] = "tmpfs" if memory else "volume"
                    warn(
                        "emptyDir memory limits and Pod lifetime stay in Kubernetes; Compose tmpfs has a container lifetime."
                        if memory
                        else "Disk-backed emptyDir becomes an anonymous Compose volume with a different lifetime."
                    )
                else:
                    warn(
                        "ConfigMap, Secret, projected, and driver-specific volume mounts stay in Kubernetes; configure their Compose equivalents separately."
                    )
                    continue
                mounts.append(item)
            if mounts:
                config["volumes"] = mounts
            config = _dollars(config)
            data["services"][name] = config
            bindings.append(
                {
                    "serviceName": name,
                    "documentIndex": document_index,
                    "containerIndex": container_index,
                    "config": copy.deepcopy(config),
                }
            )
    if any(resource["kind"] == "Service" for resource in documents):
        warn(
            "Kubernetes Services and routing stay in Kubernetes. Compose exposes container ports without publishing them to the host."
        )
    return data, {
        "kubernetes": {"documents": documents, "bindings": bindings},
        "warnings": warnings,
    }
