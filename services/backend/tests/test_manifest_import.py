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
