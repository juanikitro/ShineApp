from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from core.models import BusinessProfile

from .models import Quote, QuoteItem


class QuoteItemSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name", read_only=True)
    service_icon = serializers.CharField(source="service.icon", read_only=True)
    service_notes = serializers.CharField(source="service.notes", read_only=True)

    class Meta:
        model = QuoteItem
        fields = [
            "id",
            "service",
            "service_name",
            "service_icon",
            "service_notes",
            "description",
            "quantity",
            "unit_price",
            "line_total",
        ]
        read_only_fields = ["id", "service_name", "service_icon", "service_notes", "line_total"]
        extra_kwargs = {
            "description": {"required": False, "allow_blank": True},
            "unit_price": {"required": False},
        }

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("La cantidad debe ser mayor a cero.")
        return value


class QuoteSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    vehicle_label = serializers.SerializerMethodField()
    status_label = serializers.CharField(read_only=True)
    has_reservation = serializers.BooleanField(read_only=True)
    items = QuoteItemSerializer(many=True)

    class Meta:
        model = Quote
        fields = [
            "id",
            "public_code",
            "customer",
            "customer_name",
            "vehicle",
            "vehicle_label",
            "reservation",
            "reservation_day",
            "reservation_start_time",
            "quote_date",
            "valid_until",
            "status",
            "status_label",
            "sent_at",
            "has_reservation",
            "observations",
            "business_name",
            "business_address",
            "business_cuit",
            "business_vat_condition_label",
            "business_contact_phone",
            "business_contact_email",
            "customer_snapshot_name",
            "customer_snapshot_tax_id",
            "customer_snapshot_billing_address",
            "customer_snapshot_phone",
            "customer_snapshot_email",
            "vehicle_snapshot_label",
            "tax_rate",
            "discount_rate",
            "subtotal",
            "discount_amount",
            "taxable_amount",
            "tax_amount",
            "total",
            "terms",
            "payment_instructions",
            "items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "public_code",
            "customer_name",
            "vehicle_label",
            "reservation",
            "status_label",
            "sent_at",
            "has_reservation",
            "subtotal",
            "discount_amount",
            "taxable_amount",
            "tax_amount",
            "total",
            "created_at",
            "updated_at",
        ]

    def get_vehicle_label(self, obj):
        return str(obj.vehicle) if obj.vehicle else ""

    def validate(self, attrs):
        customer = attrs.get("customer") or getattr(self.instance, "customer", None)
        vehicle = attrs.get("vehicle") or getattr(self.instance, "vehicle", None)
        if vehicle and customer and vehicle.customer_id != customer.id:
            raise serializers.ValidationError("El vehiculo seleccionado no pertenece al cliente.")
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        quote = Quote(**self._with_quote_defaults(validated_data))
        quote._skip_snapshot_defaults = True
        quote.save()
        for item_data in items_data:
            QuoteItem.objects.create(quote=quote, **self._with_service_defaults(item_data))
        quote.recalculate()
        return quote

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        recalculation_fields = {"tax_rate", "discount_rate"}
        should_recalculate = items_data is not None or bool(recalculation_fields.intersection(validated_data))
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                QuoteItem.objects.create(quote=instance, **self._with_service_defaults(item_data))
        if should_recalculate:
            instance.recalculate()
        return instance

    def _with_quote_defaults(self, validated_data):
        data = dict(validated_data)
        profile = BusinessProfile.get_solo()
        quote_date = data.get("quote_date") or timezone.localdate()
        customer = data.get("customer")
        vehicle = data.get("vehicle")
        defaults = {
            "valid_until": quote_date + timedelta(days=profile.default_quote_validity_days),
            "business_name": profile.name,
            "business_address": profile.address,
            "business_cuit": profile.cuit,
            "business_vat_condition_label": profile.get_vat_condition_display() if profile.vat_condition else "",
            "business_contact_phone": profile.contact_phone,
            "business_contact_email": profile.contact_email,
            "tax_rate": profile.default_quote_tax_rate,
            "discount_rate": profile.default_quote_discount_rate,
            "terms": profile.default_quote_terms,
            "payment_instructions": profile.default_quote_payment_instructions,
        }
        if customer:
            defaults.update(
                {
                    "customer_snapshot_name": customer.name,
                    "customer_snapshot_tax_id": customer.tax_id,
                    "customer_snapshot_billing_address": customer.billing_address,
                    "customer_snapshot_phone": customer.phone,
                    "customer_snapshot_email": customer.email,
                }
            )
        if vehicle:
            defaults["vehicle_snapshot_label"] = str(vehicle)
        for field, value in defaults.items():
            if field not in data:
                data[field] = value
        return data

    def _with_service_defaults(self, item_data):
        item_data = dict(item_data)
        service = item_data.get("service")
        if service:
            if not item_data.get("description"):
                item_data["description"] = service.name
            item_data.setdefault("unit_price", service.base_price)
        return item_data
