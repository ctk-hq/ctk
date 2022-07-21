from rest_framework import generics, status
from rest_framework.response import Response

from .utils import generate


class GenerateGenericAPIView(generics.GenericAPIView):
    permission_classes = []

    def get(self, request):
        return Response({}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request, format=None):
        request_data = request.data
        version = request_data['data'].get('version', '3')
        services = request_data['data'].get('services', None)
        volumes = request_data['data'].get('volumes', None)
        networks = request_data['data'].get('networks', None)

        code = generate(
            services,
            volumes,
            networks,
            version=version,
            return_format='yaml')
        resp = {'code': code}


        return Response(resp, status=status.HTTP_200_OK)
