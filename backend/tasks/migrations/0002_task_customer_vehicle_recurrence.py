import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0001_initial'),
        ('customers', '0010_search_indexes'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='customer',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='tasks',
                to='customers.customer',
            ),
        ),
        migrations.AddField(
            model_name='task',
            name='vehicle',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='tasks',
                to='customers.vehicle',
            ),
        ),
        migrations.AddField(
            model_name='task',
            name='recurrence',
            field=models.CharField(
                choices=[
                    ('none', 'Sin repeticion'),
                    ('daily', 'Diaria'),
                    ('weekly', 'Semanal'),
                    ('monthly', 'Mensual'),
                ],
                default='none',
                max_length=10,
            ),
        ),
    ]
