from django.http import Http404

from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status, generics

from .models import Init
from .serializers import InitSerializer
from rest_framework.permissions import IsAuthenticated, IsAdminUser


class CreateList(generics.GenericAPIView):
    permission_classes = ()
    objects = Init.objects.all()
    serializer_class = InitSerializer

    def get(self, request):
        objects = Init.objects.all()
        serializer = InitSerializer(objects, many=True)

        return Response(serializer.data)

    def post(self, request):
        data = request.data.copy()
        serializer = InitSerializer(data=data)

        if serializer.is_valid():
            serializer.save()

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class Detail(generics.GenericAPIView):
    def get_object(self, user, obj_id):
        try:
            return Init.objects.get(id=obj_id)
        except Init.DoesNotExist:
            raise Http404

    def get(self, request, obj_id, format=None):
        _object = self.get_object(user=request.user, obj_id=obj_id)
        serializer = InitSerializer(_object)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, obj_id, format=None):
        update_data = request.data
        _object = self.get_object(user=request.user, obj_id=obj_id)
        serializer = InitSerializer(_object, data=update_data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, obj_id, format=None):
        _object = self.get_object(user=request.user, obj_id=obj_id)
        _object.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
