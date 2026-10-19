"""Public variable definitions and literal Compose dotenv output.

Private values never pass through project serialization or manifest generation.
"""

import json
import re
from typing import Any

from fastapi import HTTPException

VARIABLE_NAME = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,127}$")
REFERENCE = re.compile(
    r"\$\$|\$\{([A-Za-z_][A-Za-z0-9_]*)(?=[:?+\-}])|\$([A-Za-z_][A-Za-z0-9_]*)"
)


def validate_definitions(data: Any) -> None:
    if not isinstance(data, dict) or "variables" not in data:
        return
    definitions = data["variables"]
    if not isinstance(definitions, list) or len(definitions) > 200:
        raise HTTPException(400, "Expected at most 200 variable definitions")
    names = set()
    for definition in definitions:
        if not isinstance(definition, dict) or set(definition) - {
            "name",
            "secret",
            "default",
        }:
            raise HTTPException(
                400,
                "Project variables contain definitions only; save private values separately",
            )
        name = definition.get("name")
        if (
            not isinstance(name, str)
            or not VARIABLE_NAME.fullmatch(name)
            or name in names
        ):
            raise HTTPException(
                400,
                "Variable names must be unique shell identifiers (up to 128 characters)",
            )
        names.add(name)
        if not isinstance(definition.get("secret"), bool):
            raise HTTPException(400, "Each variable needs a secret flag")
        if "default" in definition:
            if definition["secret"]:
                raise HTTPException(400, "Secret defaults cannot be saved in a project")
            if (
                not isinstance(definition["default"], str)
                or "\x00" in definition["default"]
            ):
                raise HTTPException(
                    400, "Variable defaults must be text without NUL characters"
                )


def referenced_names(value: Any) -> set[str]:
    if isinstance(value, str):
        return {
            match.group(1) or match.group(2)
            for match in REFERENCE.finditer(value)
            if match.group(1) or match.group(2)
        }
    if isinstance(value, dict):
        return set().union(*(referenced_names(item) for item in value.values()))
    if isinstance(value, list):
        return set().union(*(referenced_names(item) for item in value))
    return set()


def project_variable_names(data: dict) -> list[str]:
    definitions = data.get("variables", [])
    return sorted(
        referenced_names(data.get("canvas", {}))
        | {item["name"] for item in definitions}
    )


def dotenv_line(name: str, value: str) -> str:
    # JSON-style quoting plus Compose's literal-dollar escape preserves quotes,
    # backslashes, multiline values, and interpolation-looking secret text.
    return name + "=" + json.dumps(value.replace("$", "$$"), ensure_ascii=False) + "\n"


def parse_project_data(value: str) -> dict:
    try:
        data = json.loads(value)
    except (ValueError, TypeError):
        raise HTTPException(400, "Project data must be valid JSON") from None
    if not isinstance(data, dict):
        raise HTTPException(400, "Project data must be an object")
    validate_definitions(data)
    return data
