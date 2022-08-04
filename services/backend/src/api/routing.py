from django.urls import include, path

from rest_framework_extensions.routers import ExtendedDefaultRouter

from .views import project, generate, user, view


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
    path("generate/", generate.GenerateGenericAPIView.as_view()),
    path("auth/self/", user.UserGenericAPIView.as_view()),
    path("auth/", include("dj_rest_auth.urls")),
    path("auth/registration/", include("dj_rest_auth.registration.urls")),
]
