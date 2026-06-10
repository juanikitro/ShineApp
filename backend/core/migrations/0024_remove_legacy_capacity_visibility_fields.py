from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0023_businessprofile_capacity_defaults'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='businessprofile',
            name='default_capacity_wash',
        ),
        migrations.RemoveField(
            model_name='businessprofile',
            name='default_capacity_detailing',
        ),
        migrations.RemoveField(
            model_name='businessprofile',
            name='public_show_wash_services',
        ),
        migrations.RemoveField(
            model_name='businessprofile',
            name='public_show_detailing_services',
        ),
    ]
