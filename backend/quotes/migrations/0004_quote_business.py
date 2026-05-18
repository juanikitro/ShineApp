from django.db import migrations, models
import django.db.models.deletion


def backfill_quote_business(apps, schema_editor):
    BusinessAccount = apps.get_model("core", "BusinessAccount")
    Quote = apps.get_model("quotes", "Quote")
    default_business, _ = BusinessAccount.objects.get_or_create(slug="default", defaults={"name": "ShineApp"})
    for quote in Quote.objects.filter(business__isnull=True).select_related("customer", "reservation").iterator():
        if quote.customer_id:
            quote.business = quote.customer.business
        elif quote.reservation_id:
            quote.business = quote.reservation.business
        else:
            quote.business = default_business
        quote.save(update_fields=["business"])


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0010_businessaccount_multitenancy"),
        ("customers", "0006_customer_vehicle_business"),
        ("quotes", "0003_quote_business_address_quote_business_contact_email_and_more"),
        ("scheduling", "0006_dailycapacity_reservation_business"),
    ]

    operations = [
        migrations.AddField(
            model_name="quote",
            name="business",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="quotes",
                to="core.businessaccount",
            ),
        ),
        migrations.RunPython(backfill_quote_business, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="quote",
            name="business",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="quotes",
                to="core.businessaccount",
            ),
        ),
    ]
