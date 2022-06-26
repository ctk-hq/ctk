from django.contrib import admin
from .models import Organization


class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "created_at", "updated_at")


admin.site.register(Organization, OrganizationAdmin)
