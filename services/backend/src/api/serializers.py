import json
from rest_framework import serializers
from .models import Project


class DataField(serializers.Field):
    def to_representation(self, value):
        return value

    def to_internal_value(self, value):
        return json.dumps(value)


class ProjectSerializer(serializers.ModelSerializer):
    data = DataField()
    class Meta(object):
        model = Project
        fields = "__all__"


class UserSelfSerializer(serializers.Serializer):
    pk = serializers.IntegerField()
    username = serializers.CharField(max_length=200)
    first_name = serializers.CharField(max_length=200)
    last_name = serializers.CharField(max_length=200)
    email = serializers.CharField(max_length=200)
