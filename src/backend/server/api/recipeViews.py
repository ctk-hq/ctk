import html
import requests

from yaml.scanner import ScannerError
from requests.exceptions import HTTPError

from django.http import Http404

from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status, generics

from .models import Recipe
from .serializers import RecipeSerializer, RecipeUpdateSerializer, RecipeReadSerializer
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from utils.utils import random_string, clean_string
from utils.pagination import CustomPagination
from utils.generators import RevereseGenerator
from .permissions import IsOwner


class CreateList(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = RecipeReadSerializer
    pagination_class = CustomPagination
    queryset = Recipe.objects.all()
    ordering_fields = ('date_updated', 'date_created')

    def filter_queryset(self, queryset):
        user = self.request.user
        queryset_filters = {'user': user}
        queryset = Recipe.objects.filter(**queryset_filters)
        return queryset

    def post(self, request):
        user = request.user
        data = request.data.copy()
        data['user'] = user.id
        data['uuid'] = random_string()
        data['data'] = data.get('data', {})
        data['url_name'] = clean_string(data['name'])
        repo = data.get('repo', None)
        branch = data.get('branch', 'master')
        raw_url = data.get('raw_url', None)

        try:
            if not repo and not raw_url:
                return Response({'message': 'Empty repo or raw url!'}, status=status.HTTP_400_BAD_REQUEST)
    
            if repo:
                _recipe_obj = Recipe.objects.get(repo=repo, branch=branch)
            else:
                _recipe_obj = Recipe.objects.get(raw_url=raw_url)

            return Response({'message': 'Recipe already exists!'}, status=status.HTTP_400_BAD_REQUEST)
        except Recipe.DoesNotExist:
            serializer = RecipeSerializer(data=data)

            if serializer.is_valid():
                serializer.save()

                return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DetailByUrlName(generics.GenericAPIView):
    def get_object(self, url_name):
        try:
            _recipe = Recipe.objects.get(url_name=url_name)
            return _recipe
        except Recipe.DoesNotExist:    
            raise Http404

    def get(self, request, url_name, format=None):
        _object = self.get_object(url_name=url_name)
        serialized = RecipeReadSerializer(_object).data

        return Response(serialized, status=status.HTTP_200_OK)


class Detail(generics.GenericAPIView):
    def get_object(self, user, uuid):
        try:
            _recipe = Recipe.objects.get(user=user.id, uuid=uuid)
            return _recipe
        except Recipe.DoesNotExist:    
            raise Http404

    def get_object_by_uuid(self, uuid):
        try:
            _recipe = Recipe.objects.get(uuid=uuid)
            return _recipe
        except Recipe.DoesNotExist:    
            raise Http404

    def get(self, request, uuid, format=None):
        resp = {}
        _object = self.get_object_by_uuid(uuid=uuid)
        raw_url = _object.raw_url
        canvas_lookup_by_s_name = {}
        canvas_lookup_by_s_uuid = {}

        try:
            if raw_url:
                try:
                    response = requests.get(raw_url)

                    if response.status_code == 200:
                        content = response.text
                        reverse_generator = RevereseGenerator(
                            content,
                            canvas_lookup_by_s_uuid=canvas_lookup_by_s_uuid,
                            canvas_lookup_by_s_name=canvas_lookup_by_s_name)
                        resp = reverse_generator.yaml_dict_to_system_obj()

                        resp['name'] = _object.name
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

    def put(self, request, uuid, format=None):
        update_data = request.data
        _object = self.get_object(user=request.user, uuid=uuid)
        update_data['desc'] = html.escape(update_data['desc'])
        update_data['url_name'] = clean_string(update_data['name'])
        serializer = RecipeUpdateSerializer(_object, data=update_data)

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


class Popular(generics.ListAPIView):
    permission_classes = ()
    serializer_class = RecipeReadSerializer
    pagination_class = CustomPagination
    queryset = Recipe.objects.all()
    ordering_fields = ('date_updated', 'date_created')

    def filter_queryset(self, queryset):
        queryset_filters = {'private': False}
        queryset = Recipe.objects.filter(**queryset_filters)
        return queryset


class Search(generics.GenericAPIView):
    permission_classes = ()
    serializer_class = RecipeReadSerializer
    pagination_class = CustomPagination

    def get(self, request, format=None):
        search_string = request.query_params.get('q', None)
        search_string_list = search_string.split(',')
        resp = {}

        if search_string:
            _results = Recipe.objects.filter(keywords__contains=search_string_list)
            page = self.paginate_queryset(_results)

            if page is not None:
                serializer = self.get_serializer(page, many=True)
                result = self.get_paginated_response(serializer.data)
                resp = result.data # pagination data
            else:
                serializer = self.get_serializer(queryset, many=True)
                resp = serializer.data


            #serialized = RecipeSerializer(_results, many=True)
            #resp = serialized.data

        return Response(resp)
