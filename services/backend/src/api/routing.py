from django.urls import include, path

from rest_framework_extensions.routers import ExtendedDefaultRouter

from .views import project, generate, user, view, auth


class DefaultRouterPlusPlus(ExtendedDefaultRouter):
    """DefaultRouter with optional trailing slash and drf-extensions nesting."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.trailing_slash = r"/?"

api_urls = [
    path("", view.ViewGenericAPIView.as_view()),
    path("projects/", project.ProjectListCreateAPIView.as_view()),
    path("projects/import/", project.ProjectImportAPIView.as_view()),
    path("projects/<str:uuid>/", project.ProjectGenericAPIView.as_view()),
    path("generate/", generate.GenerateDockerComposeView.as_view()),
    path("generate/docker-compose", generate.GenerateDockerComposeView.as_view()),
    path("generate/kubernetes", generate.GenerateK8sView.as_view()),
    path("auth/self/", user.UserGenericAPIView.as_view()),
    path("auth/", include("dj_rest_auth.urls")),
    path("auth/github/", auth.GitHubLogin.as_view(), name="github_login"),
    path("auth/registration/", include("dj_rest_auth.registration.urls")),
]
