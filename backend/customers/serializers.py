from datetime import date
from decimal import Decimal

from rest_framework import serializers

from core.permissions import context_can_view_economy

from .models import Customer, Vehicle


class CustomerSerializer(serializers.ModelSerializer):
    birthday_label = serializers.CharField(read_only=True)
    next_birthday = serializers.DateField(read_only=True, allow_null=True)
    days_until_birthday = serializers.IntegerField(read_only=True, allow_null=True)
    has_birthday_alert = serializers.BooleanField(read_only=True)

    class Meta:
        model = Customer
        fields = [
            "id",
            "name",
            "phone",
            "email",
            "tax_id",
            "billing_address",
            "birthday_month",
            "birthday_day",
            "birthday_label",
            "next_birthday",
            "days_until_birthday",
            "has_birthday_alert",
            "notes",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        month = attrs.get("birthday_month", getattr(self.instance, "birthday_month", None))
        day = attrs.get("birthday_day", getattr(self.instance, "birthday_day", None))
        if bool(month) != bool(day):
            raise serializers.ValidationError("El cumpleanos debe tener dia y mes.")
        if month and day:
            try:
                date(2000, month, day)
            except ValueError as exc:
                raise serializers.ValidationError({"birthday_day": "El dia no corresponde al mes indicado."}) from exc
        return attrs

    def validate_tax_id(self, value):
        return "".join(character for character in str(value) if character.isdigit())

    def validate_billing_address(self, value):
        return value.strip()


class CustomerListSerializer(CustomerSerializer):
    list_insights = serializers.SerializerMethodField()

    class Meta(CustomerSerializer.Meta):
        fields = [*CustomerSerializer.Meta.fields, "list_insights"]
        read_only_fields = [*CustomerSerializer.Meta.read_only_fields, "list_insights"]

    def get_list_insights(self, obj):
        include_economy = context_can_view_economy(self.context)
        insights = {
            "last_visit_at": None,
            "days_since_last_visit": None,
            "last_service_name": "",
            "last_vehicle_label": "",
            "next_reservation": None,
            "has_upcoming_reservation": False,
            "needs_follow_up": True,
        }
        if include_economy:
            insights.update(
                {
                    "balance_due_total": Decimal("0.00"),
                    "has_balance_due": False,
                    "open_quotes_count": 0,
                }
            )
        insights.update(
            self.context.get("customer_list_insights_map", {}).get(obj.id, {})
        )
        return insights


class VehicleSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    label = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = [
            "id",
            "customer",
            "customer_name",
            "label",
            "license_plate",
            "brand",
            "model",
            "color",
            "notes",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "customer_name", "label", "created_at", "updated_at"]

    def get_label(self, obj):
        return str(obj)

    def validate_license_plate(self, value):
        license_plate = value.strip().upper()
        if not license_plate:
            return ""
        queryset = Vehicle.objects.filter(license_plate=license_plate)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Ya existe un vehiculo con esta patente.")
        return license_plate

    def validate(self, attrs):
        customer = attrs.get("customer") or getattr(self.instance, "customer", None)
        if customer and not customer.is_active:
            raise serializers.ValidationError("No se puede usar un cliente inactivo.")
        return attrs
