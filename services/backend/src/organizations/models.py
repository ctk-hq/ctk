from allauth.account.signals import user_signed_up, user_logged_in
from django.db.models.signals import pre_delete
from django.contrib.auth import get_user_model
from django.dispatch import receiver
from django.db import models


User = get_user_model()


class Organization(models.Model):
    name = models.CharField(max_length=255, blank=True, null=True)
    users = models.ManyToManyField(User, related_name="orgs")
    created_at: models.DateTimeField = models.DateTimeField(auto_now_add=True)
    updated_at: models.DateTimeField = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Organization"
        verbose_name_plural = "Organizations"
        ordering = ["-created_at"]

    def total_members(self):
        return self.users.count()

    def is_member(self, user):
        return user in self.users.all()

    def add_user(self, user):
        return self.users.add(user)

    def remove_user(self, user):
        return self.users.remove(user)

    def __str__(self):
        return f"{self.name}"


@receiver(user_signed_up)
def handler(sender, request, user, **kwargs):
    org_name = f"{user.username.lower()}-org"
    org = Organization.objects.create(name=org_name)
    org.add_user(user)


@receiver(pre_delete, sender=User)
def handler(instance, **kwargs):
    for org in instance.orgs.all():
        org.remove_user(instance)
        if org.total_members() == 0:
            org.delete()
