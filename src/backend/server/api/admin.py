from django.contrib import admin

from .models import Project, Recipe, UserProfile


class UserProfileAdmin(admin.ModelAdmin):
    list_display = (
        'user',
    )


class ProjectAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'name',
        'uuid',
        'mutable',
        'private',
        'anonymous',
        'date_created',
        'date_updated')

    search_fields = []
    list_filter = ()


class RecipeAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'uuid',
        'name',
        'keywords',
        'date_created',
        'date_updated')

    search_fields = ['name', 'keywords']
    list_filter = ()


admin.site.register(UserProfile, UserProfileAdmin)
admin.site.register(Project, ProjectAdmin)
admin.site.register(Recipe, RecipeAdmin)
