import json
from pathlib import Path

import pytest

from manifest_import import import_manifest

FIXTURES = (
    Path(__file__).resolve().parents[2]
    / "frontend/src/services/fixtures/import-manifests.json"
)


@pytest.mark.parametrize(
    "fixture", json.loads(FIXTURES.read_text()), ids=lambda fixture: fixture["name"]
)
def test_shared_browser_url_import_contract(fixture):
    project = import_manifest(fixture.get("text", json.dumps(fixture["manifest"])))
    canvas = json.loads(json.dumps(project))["canvas"]
    services = {
        node["canvasConfig"]["node_name"]: node["serviceConfig"]
        for node in canvas["nodes"].values()
        if node["type"] == "SERVICE"
    }
    volumes = {
        node["canvasConfig"]["node_name"]: node["volumeConfig"]
        for node in canvas["nodes"].values()
        if node["type"] == "VOLUME"
    }
    assert services == fixture["services"]
    assert volumes == fixture["volumes"]
    if "networking" in fixture:
        assert {
            node["canvasConfig"]["node_name"]: node.get("kubernetes")
            for node in canvas["nodes"].values()
            if node["type"] == "SERVICE"
        } == fixture["networking"]
    source = canvas["manifestSource"]
    if "native" in fixture:
        assert source["kubernetes"]["documents"] == fixture["native"]
        assert all(
            binding["nodeKey"] in canvas["nodes"]
            for binding in source["kubernetes"]["bindings"]
        )
    else:
        assert source["compose"] == fixture["compose"]
    assert all(node["type"] != "NETWORK" for node in canvas["nodes"].values())


@pytest.mark.parametrize(
    "text",
    [
        "",
        "hello",
        "services: []",
        "services:\n  web: nginx",
        "services: {}\nservices: {}",
        "apiVersion: v1\nkind: List\nitems: [wrong]",
        "services: {}\n---\nservices: {}",
    ],
)
def test_invalid_url_import_is_rejected(text):
    with pytest.raises(ValueError):
        import_manifest(text)


def test_duplicate_native_identities_and_empty_lists_are_rejected():
    resource = {"apiVersion": "v1", "kind": "ConfigMap", "metadata": {"name": "config"}}
    for manifest in [
        [resource, resource],
        {"apiVersion": "v1", "kind": "List", "items": []},
    ]:
        with pytest.raises(ValueError):
            import_manifest(
                json.dumps(manifest)
                if isinstance(manifest, dict)
                else "\n---\n".join(json.dumps(item) for item in manifest)
            )


@pytest.mark.parametrize(
    "variant", ["namespace", "multiple", "shared", "sidecar", "headless"]
)
def test_service_projection_preserves_native_options_and_avoids_ambiguous_ownership(
    variant,
):
    import copy

    fixture = next(
        fixture
        for fixture in json.loads(FIXTURES.read_text())
        if fixture["name"] == "native-node-port-service"
    )
    resources = copy.deepcopy(fixture["native"])
    if variant == "namespace":
        other = copy.deepcopy(resources[1])
        other["metadata"]["namespace"] = "other"
        resources.insert(0, other)
    elif variant == "multiple":
        other = copy.deepcopy(resources[1])
        other["metadata"]["name"] = "another"
        resources.append(other)
    elif variant == "shared":
        other = copy.deepcopy(resources[0])
        other["metadata"]["name"] = "another"
        resources.append(other)
    elif variant == "sidecar":
        resources[0]["spec"]["template"]["spec"]["containers"].append(
            {"name": "sidecar", "image": "busybox"}
        )
    elif variant == "headless":
        resources[1]["spec"]["clusterIP"] = "None"
    project = import_manifest(
        "\n---\n".join(json.dumps(resource) for resource in resources)
    )
    canvas = project["canvas"]
    assert canvas["manifestSource"]["kubernetes"]["documents"] == resources
    node = next(node for node in canvas["nodes"].values() if node["type"] == "SERVICE")
    if variant == "namespace":
        assert node["kubernetes"] == fixture["networking"]["web"]
    else:
        assert "service" not in node["kubernetes"]
        assert "Kubernetes manifest" in node["kubernetes"]["serviceNotice"]
