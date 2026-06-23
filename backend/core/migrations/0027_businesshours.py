import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0026_alter_auditlog_options_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='BusinessHours',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('day_of_week', models.SmallIntegerField(choices=[(0, 'Lunes'), (1, 'Martes'), (2, 'Miercoles'), (3, 'Jueves'), (4, 'Viernes'), (5, 'Sabado'), (6, 'Domingo')])),
                ('is_open', models.BooleanField(default=True)),
                ('opening_time', models.TimeField(blank=True, null=True)),
                ('closing_time', models.TimeField(blank=True, null=True)),
                ('business', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='working_hours', to='core.businessaccount')),
            ],
            options={
                'verbose_name': 'horario del negocio',
                'verbose_name_plural': 'horarios del negocio',
                'ordering': ['day_of_week'],
                'unique_together': {('business', 'day_of_week')},
            },
        ),
    ]
