from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0009_alter_material_options_alter_supplier_options_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='materialconsumption',
            name='is_from_service_recipe',
            field=models.BooleanField(default=False),
        ),
    ]
