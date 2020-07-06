import json
import yaml
import requests
from urllib.parse import unquote

from yaml.scanner import ScannerError
from requests.exceptions import HTTPError
from django.http import Http404

from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status, generics

from utils.utils import generate_dc, random_string, generate_uuid
from utils.generators import RevereseGenerator


class RepoDetail(generics.GenericAPIView):
    permission_classes = ()

    def get(self, request):
        repo_name = request.query_params.get('r', None)
        resp = {}

        if repo_name:
            if '/' in repo_name:
                base_url = "https://hub.docker.com/v2/repositories"
            else:
                base_url = "https://hub.docker.com/v2/repositories/library"

            _results = requests.get(f"{base_url}/{repo_name}")
            data = json.dumps(_results.json())
            resp = json.loads(data)

        return Response(resp)


class RepoSearch(generics.GenericAPIView):
    permission_classes = ()

    def get(self, request):
        base_url = "https://hub.docker.com/v2/search/repositories"
        search_string = request.query_params.get('q', None)
        page = request.query_params.get('page', 1)
        resp = {}

        if search_string:
            payload = {'query': search_string, 'page': page}
            _results = requests.get(f"{base_url}/", params=payload)
            data = json.dumps(_results.json())
            resp = json.loads(data)

        return Response(resp)


class Tags(generics.GenericAPIView):
    permission_classes = ()

    def get(self, request):
        repo_name = request.query_params.get('r', None)
        page = request.query_params.get('page', 1)
        page_size = request.query_params.get('page_size', 100)
        resp = {}

        if repo_name:
            if '/' in repo_name:
                base_url = "https://hub.docker.com/v2/repositories"
            else:
                base_url = "https://hub.docker.com/v2/repositories/library"
            payload = {
                'page': page,
                'page_size': page_size
            }
            _results = requests.get(f"{base_url}/{repo_name}/tags/", params=payload)
            data = json.dumps(_results.json())
            resp = json.loads(data)

        return Response(resp)


class Import(generics.GenericAPIView):
    def post(self, request, format=None):
        resp = {}
        request_data = request.data
        yaml_string = request_data.get('yaml', None)
        project_data = request_data.get('project_data', None)
        original_canvas = None
        url = request_data.get('url', None)
        canvas_lookup_by_s_name = {}
        canvas_lookup_by_s_uuid = {}
        request_data = None

        if project_data:
            try:
                for canvas_obj in project_data['data']['canvas']:
                    canvas_lookup_by_s_uuid[canvas_obj['uuid']] = canvas_obj

                for service_obj in project_data['data']['services']:
                    if service_obj['uuid'] in canvas_lookup_by_s_uuid:
                        canvas_lookup_by_s_name[service_obj['name']] = canvas_lookup_by_s_uuid[service_obj['uuid']]
            except KeyError:
                original_canvas = None

        try:
            if yaml_string:
                reverse_generator = RevereseGenerator(
                    yaml_string,
                    canvas_lookup_by_s_uuid=canvas_lookup_by_s_uuid,
                    canvas_lookup_by_s_name=canvas_lookup_by_s_name)
                resp = reverse_generator.yaml_dict_to_system_obj()
                resp['code'] = unquote(yaml_string)


            if url:
                try:
                    response = requests.get(url)

                    if response.status_code == 200:
                        content = response.text
                        reverse_generator = RevereseGenerator(
                            content,
                            canvas_lookup_by_s_uuid=canvas_lookup_by_s_uuid,
                            canvas_lookup_by_s_name=canvas_lookup_by_s_name)
                        resp = reverse_generator.yaml_dict_to_system_obj()
                        resp['code'] = content

                    # If the response was successful, no Exception will be raised
                    response.raise_for_status()
                except HTTPError as http_err:
                    print(f'HTTP error occurred: {http_err}')  # Python 3.6
        except ScannerError as err:
            #print(f'Yaml error: {err}')
            err_string = f'<div class="error-modal-message">Malformed yaml error,  check to make sure your yaml is correct.</div> \
            <div class="error-modal-code-wrap"><pre>{err}</pre></div> \
            <small class="helper-text">Note! Url import expects a raw yaml string.</small>'
            return Response(err_string, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as err:
            #print(f'Other error occurred: {err}')  # Python 3.6
            err_string = f'<div class="error-modal-message">Malformed yaml error,  check to make sure your yaml is correct.</div> \
            <div class="error-modal-code-wrap"><pre>{err}</pre></div> \
            <small class="helper-text">Note! Url import expects a raw yaml string.</small>'
            return Response(err_string, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            pass

        return Response(resp, status=status.HTTP_200_OK)



class Generate(generics.GenericAPIView):
    def post(self, request, format=None):
        request_data = request.data

        version = request_data['data'].get('version', '3')
        services = request_data['data'].get('services', None)
        volumes = request_data['data'].get('volumes', None)
        networks = request_data['data'].get('networks', None)
        secrets = request_data['data'].get('secrets', None)
        configs = request_data['data'].get('configs', None)

        code = generate_dc(
            services,
            volumes,
            networks,
            secrets,
            configs,
            version=version,
            return_format='yaml')
        resp = {'code': code}


        return Response(resp, status=status.HTTP_200_OK)
