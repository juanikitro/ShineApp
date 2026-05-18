from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("catalog", "0003_service_business"),
        ("core", "0011_businessprofile_public_landing"),
        ("quotes", "0004_quote_business"),
        ("scheduling", "0006_dailycapacity_reservation_business"),
    ]

    operations = [
        migrations.CreateModel(
            name="PublicRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("request_type", models.CharField(choices=[("booking", "Turno"), ("quote", "Cotizacion")], max_length=16)),
                ("status", models.CharField(choices=[("pending", "Pendiente"), ("converted", "Convertida"), ("archived", "Archivada")], default="pending", max_length=16)),
                ("customer_name", models.CharField(max_length=160)),
                ("customer_phone", models.CharField(blank=True, max_length=60)),
                ("customer_email", models.EmailField(blank=True, max_length=254)),
                ("vehicle_license_plate", models.CharField(blank=True, max_length=20)),
                ("vehicle_brand", models.CharField(blank=True, max_length=80)),
                ("vehicle_model", models.CharField(blank=True, max_length=80)),
                ("vehicle_color", models.CharField(blank=True, max_length=60)),
                ("preferred_day", models.DateField(blank=True, null=True)),
                ("preferred_time", models.TimeField(blank=True, null=True)),
                ("message", models.TextField(blank=True)),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("user_agent", models.CharField(blank=True, max_length=500)),
                ("converted_at", models.DateTimeField(blank=True, null=True)),
                ("archived_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("business", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="public_requests", to="core.businessaccount")),
                ("converted_quote", models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="public_request", to="quotes.quote")),
                ("converted_reservation", models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="public_request", to="scheduling.reservation")),
            ],
            options={"ordering": ["-created_at", "-id"]},
        ),
        migrations.CreateModel(
            name="PublicRequestItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("description", models.CharField(max_length=180)),
                ("quantity", models.DecimalField(decimal_places=2, default=1, max_digits=10)),
                ("public_request", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="notifications.publicrequest")),
                ("service", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="catalog.service")),
            ],
            options={"ordering": ["id"]},
        ),
        migrations.AddIndex(
            model_name="publicrequest",
            index=models.Index(fields=["business", "status", "-created_at"], name="notificatio_busines_1b5778_idx"),
        ),
        migrations.AddIndex(
            model_name="publicrequest",
            index=models.Index(fields=["ip_address", "-created_at"], name="notificatio_ip_addr_d37b69_idx"),
        ),
    ]
