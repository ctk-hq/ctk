from django.urls import include, path, re_path
from django.views.generic import TemplateView

from . import projectViews, projectViews, recipeViews, generatorViews

from rest_auth.registration.views import (
    SocialAccountListView, SocialAccountDisconnectView
)

from . import LoginViews as views


EMAIL_CONFIRMATION = r'^auth/confirm-email/(?P<key>[-:\w]+)$'
PASSWORD_RESET = (
    r'^auth/password/reset/confirm/'
    '(?P<uidb64>[0-9A-Za-z_\-]+)-'
    '(?P<token>[0-9A-Za-z]{1,13}-[0-9A-Za-z]{1,20})$'
)

# NOTE: If you change this URL you have to update the callback URL
# in the OAuth providers' accounts, too
OAUTH_CALLBACK = 'auth/social/{provider}/callback'


# github URL patterns
github_urlpatterns = [
    path('auth-server/', views.Login.as_view(), name='github_auth_server'),
    path(
        'login/',
        views.CallbackCreate.as_view(),
        name='github_callback_login',
    ),
    path(
        'connect/',
        views.CallbackConnect.as_view(),
        name='github_callback_connect',
    ),
]

# default URL patterns
api_urlpatterns = [
    path('project/private/', projectViews.ListPrivate.as_view()),
    path('project/private/<str:uuid>/', projectViews.DetailPrivate.as_view()),

    path('project/', projectViews.CreateList.as_view()),
    path('project/<str:uuid>/', projectViews.Detail.as_view()),

    path('recipe/', recipeViews.CreateList.as_view()),
    path('recipe/name/<str:url_name>/', recipeViews.DetailByUrlName.as_view()),
    path('recipe/popular/', recipeViews.Popular.as_view()),
    path('recipe/search/', recipeViews.Search.as_view()),
    path('recipe/<str:uuid>/', recipeViews.Detail.as_view()),

    path('generate/', generatorViews.Generate.as_view()),
    path('import/', generatorViews.Import.as_view()),
    path('repo/search/', generatorViews.RepoSearch.as_view()),
    path('repo/detail/', generatorViews.RepoDetail.as_view()),
    path('tags/', generatorViews.Tags.as_view()),

    # non social auth endpoints
    path('auth/', include('rest_auth.urls')),
    path('auth/registration/', include('rest_auth.registration.urls')),
    path('auth/social/github/', include(github_urlpatterns)),
    path(
        'auth/user/accounts/',
        SocialAccountListView.as_view(),
        name='social_account_list',
    ),
    path(
        'auth/user/accounts/<int:pk>/disconnect/',
        SocialAccountDisconnectView.as_view(),
        name='social_account_disconnect',
    ),
]


urlpatterns = [
    # The SPA serves these URLs but the backend has to know
    # where they point to for reference, don't change the url names.
    re_path(
        EMAIL_CONFIRMATION,
        TemplateView.as_view(),
        name='account_confirm_email',
    ),
    re_path(
        PASSWORD_RESET,
        TemplateView.as_view(),
        name='password_reset_confirm',
    ),
    path(
        OAUTH_CALLBACK.format(provider='github'),
        TemplateView.as_view(),
        name='github_callback',
    ),
    # This has to be last because rest_auth.registration.urls
    # also defines `account_confirm_email` what we override above.
    path('api/', include(api_urlpatterns)),
]