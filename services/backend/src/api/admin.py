from django.contrib import admin
from .models import Project


class ProjectAdmin(admin.ModelAdmin):
  list_display = (
      'id',
      'project_type',
      'visibility',
      'name',
      'uuid',
      'created_at',
      'updated_at')


admin.site.register(Project, ProjectAdmin)
