# Generated by Django 4.0.4 on 2022-08-21 13:30

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_project_visibility'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='project_type',
            field=models.SmallIntegerField(default='0'),
        ),
    ]
