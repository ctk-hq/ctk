import uuid
import requests
import yaml
import json
import copy
import uuid
import hashlib
import random
import string
import networkx as nx

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.serializers import ProjectSerializer
from api.models import Project
from api.filters import FilterByOrg

from organizations.utils import get_user_org

from .utils import get_project_obj_by_uuid

base_network = {
    "key": "",
    "type": "",
    "position": {
        "left": 0,
        "top": 0
    },
    "inputs": [],
    "outputs": [],
    "canvasConfig": {
        "node_name": ""
    }
}

base_node = {
    "key": "",
    "type": "",
    "position": {
        "left": 0,
        "top": 0
    },
    "inputs": [],
    "outputs": [],
    "canvasConfig": {
        "node_name": ""
    }
}

base_project = {
    "canvas": {
        "position": {
            "top": 0,
            "left": 0,
            "scale": 1
        },
        "nodes": {},
        "connections": [],
        "networks": {}
    }
}

def normalize_position(pos):
    offet = 200
    position_offset = 150
    return {
        "top": (pos[0] * position_offset) + offet,
        "left": (pos[1] * position_offset) + offet
    }

def build_service_node(key, uuid, service_config, positions):
    node = copy.deepcopy(base_node)
    node["canvasConfig"]["node_name"] = key
    node["serviceConfig"] = service_config
    node["key"] = uuid
    node["type"] = "SERVICE"
    node["inputs"] = [f"ip_{uuid}"]
    node["position"] = normalize_position(positions[uuid])
    node["outputs"] = [f"op_{uuid}"]
    return node

def build_network_node(key, uuid, network_config, positions):
    node = copy.deepcopy(base_node)
    node["canvasConfig"]["node_name"] = key
    node["networkConfig"] = network_config
    node["key"] = uuid
    node["position"] = normalize_position(positions[uuid])
    node["type"] = "NETWORK"

class ProjectImportAPIView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProjectSerializer

    def create(self, request, *args, **kwargs):
        org = get_user_org(request.user)
        data = { **request.data }

        project = copy.deepcopy(base_project)
        req = requests.get(data["url"], allow_redirects=True)
        import_data = yaml.safe_load(req.content)
        project_hash = str(int(hashlib.sha1(data["url"].encode("utf-8")).hexdigest(), 16) % (10 ** 8))
        project_uuid = "_".join(["".join([chr(ord('a') + int(x)) for x in project_hash]), "".join(random.choices(string.ascii_lowercase, k=5))])
        node_name_uuid = {}
        graph = nx.Graph()

        if "services" in import_data:
            for key in import_data["services"]:
                node_uuid = f"service-{uuid.uuid4()}"
                node_name_uuid[key] = node_uuid
                graph.add_node(node_uuid)

        if "networks" in import_data:
            for key in import_data["networks"]:
                node_uuid = f"network-{uuid.uuid4()}"
                node_name_uuid[key] = node_uuid
                graph.add_node(node_uuid)

        positions = nx.spring_layout(graph, k=1, iterations=50)

        if "services" in import_data:
            for key in import_data["services"]:
                service_uuid = node_name_uuid[key]
                service_config = import_data["services"][key]
                project["canvas"]["nodes"][service_uuid] = (
                    build_service_node(key, service_uuid, service_config, positions))

                if "depends_on" in import_data["services"][key]:
                    for dep in import_data["services"][key]["depends_on"]:
                        project["canvas"]["connections"].append(
                            [service_uuid, node_name_uuid[dep]])

        if "networks" in import_data:
            for key in import_data["networks"]:
                network_uuid = node_name_uuid[key]
                network_config = import_data["networks"][key]
                project["canvas"]["nodes"][network_uuid] = (
                    build_network_node(key, network_uuid, network_config, positions))

        try:
            obj = Project.objects.get(uuid=project_uuid, org=org)
            obj.data = json.dumps(project)
            obj.visibility = data["visibility"]
            obj.save()
            return Response(
                ProjectSerializer(obj).data,
                status=status.HTTP_201_CREATED)
        except Project.DoesNotExist:
            obj = Project(
                org=org,
                name=project_uuid,
                uuid=project_uuid,
                visibility=data["visibility"],
                data=json.dumps(project))
            obj.save()
        
        return Response(ProjectSerializer(obj).data)


class ProjectListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = []
    serializer_class = ProjectSerializer
    queryset = Project.objects.all()

    def filter_queryset(self, queryset):
        filter_backends = (FilterByOrg,)

        for backend in list(filter_backends):
            queryset = backend().filter_queryset(self.request, queryset, view=self)

        return queryset

    def list(self, request):
        try:
            queryset = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(str(e), status=status.HTTP_400_BAD_REQUEST)

    def create(self, request, *args, **kwargs):
        org = None if request.user.is_anonymous else get_user_org(request.user)
        data = {
            "uuid": str(uuid.uuid4())[:10],
            **request.data
        }

        if org:
            data["org"] = org.pk

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )


class ProjectGenericAPIView(generics.GenericAPIView):
    permission_classes = []
    serializer_class = ProjectSerializer
    queryset = Project.objects.all()

    def get(self, request, uuid):
        try:
            org = None if request.user.is_anonymous else get_user_org(request.user)
            if project_obj := get_project_obj_by_uuid(uuid):
                if project_obj.org == org:
                    return Response(ProjectSerializer(project_obj).data)
                
                if project_obj.visibility == 1:
                    return Response(ProjectSerializer(project_obj).data)
        except Exception as e:
            return Response(str(e), status=status.HTTP_400_BAD_REQUEST)

        return Response({}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, uuid):
        org = None if request.user.is_anonymous else get_user_org(request.user)
        if project_obj := get_project_obj_by_uuid(uuid):
            if project_obj.org == org:
                data = request.data
                serializer = ProjectSerializer(project_obj, data=data)

                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data)

                return Response(serializer.errors, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, uuid):
        org = None if request.user.is_anonymous else get_user_org(request.user)
        if project_obj := get_project_obj_by_uuid(uuid):
            if project_obj.org == org:
                project_obj.delete()
                return Response({}, status=status.HTTP_204_NO_CONTENT)
        return Response({}, status=status.HTTP_404_NOT_FOUND)
