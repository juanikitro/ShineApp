from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0009_remove_service_service_type'),
        ('inventory', '0009_alter_material_options_alter_supplier_options_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='ServiceMaterial',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.DecimalField(decimal_places=3, max_digits=10)),
                ('notes', models.CharField(blank=True, max_length=200)),
                ('material', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='service_recipes', to='inventory.material')),
                ('service', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='materials', to='catalog.service')),
            ],
            options={
                'ordering': ['id'],
                'unique_together': {('service', 'material')},
            },
        ),
    ]
