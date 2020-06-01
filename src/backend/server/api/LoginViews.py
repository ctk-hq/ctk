import re

from django.utils.translation import gettext as _
from django.conf import settings

from allauth.socialaccount.models import SocialLogin
from allauth.socialaccount.providers.base import AuthAction
from allauth.socialaccount.providers.github.views import GitHubOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from allauth.socialaccount.providers.oauth2.views import OAuth2LoginView
from rest_auth.registration.views import SocialConnectView, SocialLoginView
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from .serializers import CallbackSerializer


class CallbackMixin:
    adapter_class = GitHubOAuth2Adapter
    client_class = OAuth2Client
    # This is our serializer from above
    # You can omit this if you handle CSRF protection in the frontend
    serializer_class = CallbackSerializer

    # Not the prettiest but single source of truth
    @property
    def callback_url(self):
        url = self.adapter_class(self.request).get_callback_url(
            self.request,
            None,
        )

        url = settings.SOCIAL_AUTH_CUSTOM_CALLBACK_PAGE
        return url


class CallbackCreate(CallbackMixin, SocialLoginView):
    """
    Logs the user in with the providers data.
    Creates a new user account if it doesn't exist yet.
    """


class CallbackConnect(CallbackMixin, SocialConnectView):
    """
    Connects a provider's user account to the currently logged in user.
    """

    # You can override this method here if you don't want to
    # receive a token. Omit it otherwise.
    def get_response(self):
        return Response({'detail': _('Connection completed.')})


class Login(APIView):
    adapter_class = GitHubOAuth2Adapter
    permission_classes = (AllowAny,)

    def post(self, request, format=None):
        """
        Returns the URL to the login page of provider's authentication server.
        """
        # You should have CSRF protection enabled, see
        # https://security.stackexchange.com/a/104390 (point 3).
        # Therefore this is a POST endpoint.
        # This code is inspired by `OAuth2LoginView.dispatch`.
        adapter = self.adapter_class(request)
        provider = adapter.get_provider()
        app = provider.get_app(request)
        view = OAuth2LoginView()
        view.request = request
        view.adapter = adapter
        client = view.get_client(request, app)
        # You can modify `action` if you have more steps in your auth flow
        action = AuthAction.AUTHENTICATE
        auth_params = provider.get_auth_params(request, action)
        # You can omit this if you want to validate the state in the frontend
        #client.state = SocialLogin.stash_state(request)
        url = client.get_redirect_url(adapter.authorize_url, auth_params)
        custom_call_back_url = settings.SOCIAL_AUTH_CUSTOM_CALLBACK

        if custom_call_back_url:
            url = custom_call_back_url
        else:
            url = re.sub('api.', 'app.', url)
            url = re.sub('staging-api.', 'staging-app.', url)

        return Response({'url': url})
