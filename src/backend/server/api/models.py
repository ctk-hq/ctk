import hashlib
import requests

from django.db import models
from django.contrib.postgres.fields import ArrayField
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.contrib.postgres.fields import JSONField, ArrayField
from django.dispatch import receiver
from django.db.utils import IntegrityError

from allauth.socialaccount.models import SocialAccount, SocialToken, SocialApp
from allauth.account.signals import user_signed_up, user_logged_in

try:
    from django.utils.encoding import force_text
except ImportError:
    from django.utils.encoding import force_unicode as force_text

from utils.utils import random_string
from .mixins import TimeStamp


User = get_user_model()


class UserProfile(models.Model):
    user = models.OneToOneField(
        User,
        primary_key=True,
        verbose_name='user',
        related_name='profile',
        on_delete=models.CASCADE)
    avatar_url = models.CharField(max_length=256, blank=True, null=True)

    def __str__(self):
        return force_text(self.user.email)

    class Meta():
        db_table = 'user_profile'


class Recipe(TimeStamp):
    user = models.ForeignKey(
        User,
        related_name='user_recipes',
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        help_text='user'
    )
    uuid = models.CharField(max_length=255, blank=False, null=False)
    name = models.CharField(max_length=500, blank=False, null=False)
    url_name = models.CharField(max_length=1000, blank=True, null=True)
    desc = models.TextField(blank=True, null=True)
    keywords = ArrayField(
        models.CharField(max_length=150, blank=True),
        blank=True,
        null=True,
    )
    repo = models.CharField(max_length=500, blank=True, null=True)
    branch = models.CharField(max_length=500, blank=True, null=True)
    raw_url = models.CharField(max_length=1000, blank=True, null=True)
    data = JSONField(default=dict, blank=True, help_text="recipe json")

    # not listed publicly,  needs a direct link
    private = models.BooleanField(default=False, blank=False, null=False)

    class Meta(object):
        verbose_name = 'Recipe'
        verbose_name_plural = 'Recipes'
        ordering = ['-id']

    def __str__(self):
        return "{}".format(self.id)


class Project(TimeStamp):
    user = models.ForeignKey(
        User,
        related_name='user_projects',
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        help_text='user'
    )

    name = models.CharField(max_length=255, blank=False, null=False)
    uuid = models.CharField(max_length=255, blank=False, null=False)
    data = JSONField(default=dict, blank=True, help_text="project json")

    # anonymous projects that can not be mutitated, only cloned anonymously or authenticated
    mutable = models.BooleanField(default=True, blank=False, null=False)

    # not listed publicly,  needs a direct link
    private = models.BooleanField(default=False, blank=False, null=False)

    # for projects created anonymously, stay anonymous forever
    # if a user is logged in, they can clone the anonymous project to make it their own
    anonymous = models.BooleanField(default=True, blank=False, null=False)

    class Meta(object):
        verbose_name = 'Project'
        verbose_name_plural = 'Projects'
        ordering = ['-id']

    def __str__(self):
        return "{}".format(self.id)


@receiver(post_save, sender=SocialToken)
def get_user_email(sender, instance=None, created=False, **kwargs):
    django_user_obj = instance.account.user
    access_token = instance.token
    email = None

    with requests.Session() as session:
        params = {'access_token': access_token}
        headers = {'Connection': 'close'}
        req_return = session.get('https://api.github.com/user/emails', params=params, headers=headers)
        status_code = req_return.status_code

        if status_code == 200:
            req_return_data = req_return.json()[0]
            email = req_return_data['email']
        
        session.close()

    try:
        if email:
            django_user_obj.email = email
            django_user_obj.save()
    except IntegrityError as e:
        print('Exception:', e)


@receiver(user_signed_up)
def social_login_fname_lname_profilepic(sociallogin=None, user=None, **kwargs):
    preferred_avatar_size_pixels=256
    email_first_part = user.email.split("@")[0]
    username_postfix = random_string(5)
    username = f"{email_first_part}_{username_postfix}"
    user.username = username

    picture_url = "http://www.gravatar.com/avatar/{0}?s={1}".format(
        hashlib.md5(user.email.encode('UTF-8')).hexdigest(),
        preferred_avatar_size_pixels
    )

    if sociallogin:
        # Extract first / last names from social nets and store on User record
        if sociallogin.account.provider == 'twitter':
            name = sociallogin.account.extra_data['name']
            user.first_name = name.split()[0]
            user.last_name = name.split()[1]

        if sociallogin.account.provider == 'facebook':
            f_name = sociallogin.account.extra_data['first_name']
            l_name = sociallogin.account.extra_data['last_name']
            if f_name:
                user.first_name = f_name
            if l_name:
                user.last_name = l_name

            #verified = sociallogin.account.extra_data['verified']
            picture_url = "http://graph.facebook.com/{0}/picture?width={1}&height={1}".format(
                sociallogin.account.uid, preferred_avatar_size_pixels)

        if sociallogin.account.provider == 'google':
            f_name = sociallogin.account.extra_data['given_name']
            l_name = sociallogin.account.extra_data['family_name']
            if f_name:
                user.first_name = f_name
            if l_name:
                user.last_name = l_name
            #verified = sociallogin.account.extra_data['verified_email']
            picture_url = sociallogin.account.extra_data['picture']

        if sociallogin.account.provider == 'github':
            #name = sociallogin.account.extra_data['name']
            #user.first_name = name.split()[0]
            #user.last_name = name.split()[1]
            picture_url = sociallogin.account.extra_data['avatar_url']

    user.save()
    profile = UserProfile(user=user, avatar_url=picture_url)
    profile.save()
