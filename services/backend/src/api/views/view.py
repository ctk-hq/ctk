from rest_framework.response import Response
from rest_framework import generics, status


class ViewGenericAPIView(generics.GenericAPIView):
    permission_classes = []

    def get(self, request):
        return Response({}, status=status.HTTP_404_NOT_FOUND)
