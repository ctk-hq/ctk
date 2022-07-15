from typing import Callable, Optional

from django.contrib import admin
from django.urls import URLPattern, include, path

from api.routing import api_urls


def opt_slash_path(route: str, view: Callable, name: Optional[str] = None) -> URLPattern:
    """Catches path with or without trailing slash, taking into account query param and hash."""
    # Ignoring the type because while name can be optional on re_path, mypy doesn't agree
    return re_path(fr"^{route}/?(?:[?#].*)?$", view, name=name)  # type: ignore


urlpatterns = [
    path('admin/', admin.site.urls),
    path("v1/", include(api_urls)),
]
