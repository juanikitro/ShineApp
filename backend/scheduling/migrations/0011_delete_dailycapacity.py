from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("scheduling", "0010_alter_reservationitem_options_and_more"),
        ("core", "0022_businessprofile_capacity_defaults"),
    ]

    operations = [
        migrations.DeleteModel(
            name="DailyCapacity",
        ),
    ]
