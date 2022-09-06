import re
import io
import shutil
import json
import subprocess as sp

from ruamel.yaml import YAML
from pathlib import Path
from rest_framework import generics, status
from rest_framework.response import Response
from .utils import (
    generate, clean_dict, get_random_string, read_dir)


def generate_docker_compose(data):
    version = data.get('version', '3')
    services = data.get('services', None)
    volumes = data.get('volumes', None)
    networks = data.get('networks', None)

    return generate(
        services,
        volumes,
        networks,
        version=version,
        return_format='yaml')

class GenerateDockerComposeView(generics.GenericAPIView):
    permission_classes = []

    def get(self, request):
        return Response({}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request, format=None):
        request_data = json.loads(request.data)
        code = generate_docker_compose(request_data["data"])
        resp = {'code': code}
        return Response(resp, status=status.HTTP_200_OK)

class GenerateK8sView(generics.GenericAPIView):
    permission_classes = []

    def get(self, request):
        return Response({}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request, format=None):
        resp = {
            'code': "",
            'error': ""
        }
        workdir = f"/tmp/{get_random_string(8)}"
        request_data = json.loads(request.data)
        omitted = clean_dict(request_data["data"], ["env_file", "build", "secrets"])
        docker_compose_code = generate_docker_compose(omitted)
        path = Path(workdir)
        path.mkdir(exist_ok=True)

        with open(f"{path}/docker-compose.yaml", 'w') as f:
            f.write(docker_compose_code)

        process = sp.Popen([
            "kompose",
            "--suppress-warnings",
            "--file",
            f"{path}/docker-compose.yaml", "convert"
        ], cwd=workdir, stdout=sp.PIPE, stderr=sp.PIPE)
        process.wait()
        _, out = process.communicate()

        if out:
            out = out.decode("utf-8")
            parts = out.split(" ")
            parts.pop()
            parts.pop(0)
            final_list = [re.sub(r'\[.*?;.*?m', '', x) for x in parts if any(x)]
            resp["error"] = " ".join(final_list)

        workdir_files = read_dir(workdir)
        workdir_files.remove("docker-compose.yaml")

        for file in workdir_files:
            with open(f"{workdir}/{file}") as f:
                yaml = YAML()
                yaml.indent(mapping=2, sequence=4, offset=2)
                yaml.explicit_start = True
                data = yaml.load(f)

                del data["metadata"]["annotations"]
                del data["spec"]["template"]["metadata"]["annotations"]

                buf = io.BytesIO()
                yaml.dump(data, buf)
                resp["code"] = buf.getvalue()

        shutil.rmtree(workdir)
        return Response(resp, status=status.HTTP_200_OK)
