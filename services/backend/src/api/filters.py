from rest_framework.filters import BaseFilterBackend
from organizations.utils import get_user_org


class FilterByOrg(BaseFilterBackend):
    def filter_queryset(self, request, queryset, view):
        org = get_user_org(request.user)
        queryset_filters = {"org": org}
        return queryset.filter(**queryset_filters)
