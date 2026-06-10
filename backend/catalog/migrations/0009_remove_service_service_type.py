from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0008_make_service_sector_required'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='service',
            name='service_type',
        ),
        migrations.AlterModelOptions(
            name='service',
            options={'base_manager_name': 'objects', 'ordering': ['sector__order', 'name']},
        ),
    ]
