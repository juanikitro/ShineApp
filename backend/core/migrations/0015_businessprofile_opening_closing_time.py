from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0014_alter_passwordresettoken_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='businessprofile',
            name='opening_time',
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='businessprofile',
            name='closing_time',
            field=models.TimeField(blank=True, null=True),
        ),
    ]
