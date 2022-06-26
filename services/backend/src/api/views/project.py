import uuid
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.serializers import ProjectSerializer
from api.models import Project
from api.filters import FilterByOrg

from organizations.utils import get_user_org

from .utils import get_project_obj_by_uuid


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
                return Response(ProjectSerializer(project_obj).data)
        except Exception as e:
            return Response(str(e), status=status.HTTP_400_BAD_REQUEST)

        return Response({}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, uuid):
        org = None if request.user.is_anonymous else get_user_org(request.user)
        if project_obj := get_project_obj_by_uuid(uuid):
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
            project_obj.delete()
            return Response({}, status=status.HTTP_204_NO_CONTENT)
        return Response({}, status=status.HTTP_404_NOT_FOUND)
