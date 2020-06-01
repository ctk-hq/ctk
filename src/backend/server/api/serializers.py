import html

from django.core.exceptions import PermissionDenied
from django.utils.translation import gettext as _

from allauth.socialaccount.models import SocialLogin
from rest_auth.registration.serializers import SocialLoginSerializer
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from rest_framework.authentication import SessionAuthentication
from rest_framework import serializers

from .models import Project, Recipe


from rest_framework.authtoken.models import Token


class TokenSerializer(serializers.ModelSerializer):

    class Meta:
        model = Token
        fields = ('key', 'user')


class RecipeSerializer(serializers.ModelSerializer):

    class Meta(object):
        model = Recipe
        fields = '__all__'


class RecipeReadSerializer(serializers.BaseSerializer):
    def to_representation(self, instance):
        return {
            'uuid': instance.uuid,
            'name': instance.name,
            'url_name': instance.url_name,
            'desc': html.unescape(instance.desc),
            'keywords': instance.keywords,
            'data': instance.data,
            'repo': instance.repo,
            'branch': instance.branch,
            'raw_url': instance.raw_url,
            'private': instance.private
        }


class RecipeUpdateSerializer(serializers.ModelSerializer):

    class Meta(object):
        model = Recipe
        fields = [
            'name',
            'url_name',
            'desc',
            'keywords',
            'data',
            'repo',
            'raw_url',
            'private'
        ]


class ProjectSerializer(serializers.ModelSerializer):

    class Meta(object):
        model = Project
        fields = '__all__'


class ProjectUpdateSerializer(serializers.ModelSerializer):

    class Meta(object):
        model = Project
        fields = [
            'name',
            'mutable',
            'private',
            'anonymous',
            'data'
        ]


class CallbackSerializer(SocialLoginSerializer):
    '''
    state = serializers.CharField()

    def validate_state(self, value):
        """
        Checks that the state is equal to the one stored in the session.
        """
        try:
            SocialLogin.verify_and_unstash_state(
                self.context['request'],
                value,
            )
        # Allauth raises PermissionDenied if the validation fails
        except PermissionDenied:
            raise ValidationError(_('State did not match.'))
        return value
    '''