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


def generate_docker_compose_yaml(payload: dict[str, Any]) -> str:
    version = str(payload.get("version", "3"))
    services = payload.get("services")
    volumes = payload.get("volumes")
    networks = payload.get("networks")

    output = io.StringIO()
    yaml = YAML()
    yaml.indent(mapping=2, sequence=4, offset=2)
    yaml.preserve_quotes = True
    yaml.explicit_start = True

    specified_version = _parse_version(version)
    major_version = int(specified_version)

    yaml.dump({"version": DoubleQuotedScalarString(str(specified_version))}, output)
    yaml.explicit_start = False
    output.write("\n")

    if services:
        if major_version in {2, 3}:
            yaml.dump({"services": services}, output, transform=_sequence_indent_four)
        elif major_version == 1:
            yaml.dump(services, output, transform=_sequence_indent_one)
        output.write("\n")

    if major_version in {2, 3} and networks:
        yaml.dump({"networks": networks}, output)
        output.write("\n")

    if volumes:
        yaml.dump({"volumes": volumes}, output)

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
