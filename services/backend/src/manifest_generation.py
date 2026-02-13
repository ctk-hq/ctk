import io
import os
import re
import random
import shutil
import string
import contextlib
import subprocess as sp

from pathlib import Path
from typing import Any

from ruamel.yaml import YAML
from ruamel.yaml.scalarstring import DoubleQuotedScalarString


def _sequence_indent_four(text: str) -> str:
    result = ""
    first_indent = True

    for line in text.splitlines(True):
        stripped = line.lstrip()
        indent = len(line) - len(stripped)

        if indent == 2 and not first_indent:
            result += "\n"

        result += line

        if indent == 2 and first_indent:
            first_indent = False

    return result


def _sequence_indent_one(text: str) -> str:
    result = ""
    first_indent = True

    for line in text.splitlines(True):
        stripped = line.lstrip()
        indent = len(line) - len(stripped)

        if indent == 0 and not first_indent:
            result += "\n"

        result += line

        if indent == 0 and first_indent:
            first_indent = False

    return result


def _parse_version(version: str) -> int | float:
    try:
        return int(version)
    except ValueError:
        return float(version)


def _is_latest_compose_spec(version: str) -> bool:
    return version.strip().lower() in {
        "latest",
        "latest (spec)",
        "spec",
        "compose-spec",
    }


def generate_docker_compose_yaml(payload: dict[str, Any]) -> str:
    version = str(payload.get("version", "latest")).strip()
    services = payload.get("services")
    volumes = payload.get("volumes")
    networks = payload.get("networks")

    output = io.StringIO()
    yaml = YAML()
    yaml.indent(mapping=2, sequence=4, offset=2)
    yaml.preserve_quotes = True
    yaml.explicit_start = True
    wrote_document = False

    def dump_chunk(data: dict[str, Any], transform: Any = None) -> None:
        nonlocal wrote_document
        yaml.explicit_start = not wrote_document
        if transform:
            yaml.dump(data, output, transform=transform)
        else:
            yaml.dump(data, output)
        wrote_document = True

    latest_compose_spec = _is_latest_compose_spec(version)
    major_version = 3

    if not latest_compose_spec:
        specified_version = _parse_version(version)
        major_version = int(specified_version)
        dump_chunk({"version": DoubleQuotedScalarString(str(specified_version))})
        output.write("\n")

    if services:
        if latest_compose_spec or major_version in {2, 3}:
            dump_chunk({"services": services}, transform=_sequence_indent_four)
        elif major_version == 1:
            dump_chunk(services, transform=_sequence_indent_one)
        output.write("\n")

    if (latest_compose_spec or major_version in {2, 3}) and networks:
        dump_chunk({"networks": networks})
        output.write("\n")

    if volumes:
        dump_chunk({"volumes": volumes})

    output.seek(0)
    return output.read()


def clean_dict(data: Any, omit: set[str] | None = None) -> Any:
    if isinstance(data, dict):
        cleaned: dict[str, Any] = {}
        for key, value in data.items():
            if omit and key in omit:
                continue
            cleaned[key] = clean_dict(value, omit)
        return cleaned

    if isinstance(data, list):
        return [clean_dict(item, omit) for item in data]

    return data


def _get_random_string(length: int) -> str:
    letters = string.ascii_lowercase
    return "".join(random.choice(letters) for _ in range(length))


def _read_dir(path: str) -> list[str]:
    return [
        file_name
        for file_name in os.listdir(path)
        if os.path.isfile(os.path.join(path, file_name))
    ]


def generate_kubernetes_manifest(payload: dict[str, Any]) -> dict[str, str]:
    response = {"code": "", "error": ""}
    workdir = Path(f"/tmp/{_get_random_string(8)}")
    workdir.mkdir(exist_ok=True)

    compose_payload = clean_dict(
        payload,
        omit={"env_file", "build", "secrets", "profiles"},
    )
    docker_compose_code = generate_docker_compose_yaml(compose_payload)

    compose_path = workdir / "docker-compose.yaml"
    compose_path.write_text(docker_compose_code)

    if not shutil.which("kompose"):
        response["error"] = "kompose is not installed in the backend container"
        shutil.rmtree(workdir)
        return response

    process = sp.Popen(
        [
            "kompose",
            "--suppress-warnings",
            "--file",
            str(compose_path),
            "convert",
        ],
        cwd=str(workdir),
        stdout=sp.PIPE,
        stderr=sp.PIPE,
    )
    _, stderr = process.communicate()

    if stderr:
        text = stderr.decode("utf-8")
        parts = text.split(" ")

        if parts:
            parts.pop()
        if parts:
            parts.pop(0)

        cleaned_parts = [re.sub(r"\[.*?;.*?m", "", piece) for piece in parts if piece]
        response["error"] = " ".join(cleaned_parts)

    workdir_files = _read_dir(str(workdir))

    if "docker-compose.yaml" in workdir_files:
        workdir_files.remove("docker-compose.yaml")

    for index, file_name in enumerate(workdir_files):
        with (workdir / file_name).open("r") as file_handle:
            yaml = YAML()
            yaml.indent(mapping=2, sequence=4, offset=2)
            yaml.explicit_start = True
            data = yaml.load(file_handle)

            with contextlib.suppress(KeyError, TypeError):
                del data["metadata"]["annotations"]
            with contextlib.suppress(KeyError, TypeError):
                del data["spec"]["template"]["metadata"]["annotations"]

            buffer = io.BytesIO()

            yaml.dump(data, buffer)

            response["code"] += buffer.getvalue().decode("utf-8")

            if index != len(workdir_files) - 1:
                response["code"] += "\n"

    shutil.rmtree(workdir)
    return response
