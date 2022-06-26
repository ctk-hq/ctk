from django.db import models
from organizations.models import Organization


class Project(models.Model):
    org = models.ForeignKey(
        Organization,
        blank=True,
        null=True,
        related_name="projects",
        on_delete=models.CASCADE,
    )
    name = models.CharField(max_length=500, blank=False, null=False, default="Untitled")
    uuid = models.CharField(max_length=500, blank=True, null=True, unique=True)
    data = models.TextField(blank=False)
    created_at: models.DateTimeField = models.DateTimeField(auto_now_add=True)
    updated_at: models.DateTimeField = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Project"
        verbose_name_plural = "Projects"
        ordering = ["-created_at"]
