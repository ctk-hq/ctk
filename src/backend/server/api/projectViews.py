from django.http import Http404

from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status, generics

from .models import Project
from .serializers import ProjectSerializer, ProjectUpdateSerializer
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from utils.utils import random_string
from utils.pagination import CustomPagination
from .permissions import IsOwner


class ListPrivate(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProjectSerializer
    pagination_class = CustomPagination
    queryset = Project.objects.all()
    ordering_fields = ('date_updated', 'date_created')

    def filter_queryset(self, queryset):
        user = self.request.user
        queryset_filters = {'user': user}
        queryset = Project.objects.filter(**queryset_filters)
        return queryset


class DetailPrivate(generics.GenericAPIView):
    permission_classes = [IsAuthenticated & IsOwner]

    def get_object(self, user, uuid):
        try:
            return Project.objects.get(uuid=uuid)
        except Project.DoesNotExist:
            raise Http404

    """
    def get(self, request, uuid, format=None):
        user = request.user
        _object = self.get_object(user=user, uuid=uuid)
        self.check_object_permissions(request, _object)
        serializer = ProjectSerializer(_object)
        return Response(serializer.data, status=status.HTTP_200_OK)
    """

    def put(self, request, uuid, format=None):
        user = request.user
        update_data = request.data
        _object = self.get_object(user=user, uuid=uuid)
        self.check_object_permissions(request, _object)
        serializer = ProjectUpdateSerializer(_object, data=update_data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, uuid, format=None):
        _object = self.get_object(user=request.user, uuid=uuid)
        _object.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CreateList(generics.ListAPIView):
    permission_classes = ()
    serializer_class = ProjectSerializer
    pagination_class = CustomPagination
    queryset = Project.objects.all()
    ordering_fields = ('date_updated', 'date_created')

    def filter_queryset(self, queryset):
        queryset_filters = {'user': None, 'private': False}
        queryset = Project.objects.filter(**queryset_filters)
        return queryset

    def post(self, request):
        user = request.user
        data = request.data.copy()
        data['user'] = user.id
        data['uuid'] = random_string()

        if request.user.is_authenticated:
            data['anonymous'] = False
            data['private'] = True

        serializer = ProjectSerializer(data=data)

        if serializer.is_valid():
            serializer.save()

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class Detail(generics.GenericAPIView):
    def get_object(self, user, uuid):
        try:
            _project = Project.objects.get(uuid=uuid)

            if _project.user == None and _project.private == False:
                return _project

            if user.is_authenticated:
                if user == _project.user:
                    return _project
            
            raise Http404
        except Project.DoesNotExist:    
            raise Http404

    def get(self, request, uuid, format=None):
        _object = self.get_object(user=request.user, uuid=uuid)

        serializer = ProjectSerializer(_object)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, uuid, format=None):
        update_data = request.data
        _object = self.get_object(user=request.user, uuid=uuid)

        if request.user.is_authenticated:
            update_data['anonymous'] = False
            update_data['private'] = True

        serializer = ProjectUpdateSerializer(_object, data=update_data)

        # prevent anonymous projects from getting owned by an authenticated user
        if serializer.is_valid():
            if request.user.is_authenticated and _object.user != request.user:
                update_data['user'] = request.user
                update_data['uuid'] = random_string()
                serializer.create(validated_data=update_data)
            else:
                serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, uuid, format=None):
        _object = self.get_object(user=request.user, uuid=uuid)
        _object.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
