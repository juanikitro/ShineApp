from rest_framework import serializers

from core.permissions import EconomyFieldsMixin
from core.serializers import BusinessScopedSerializerMixin

from .models import Service


PRICE_BY_TYPE_FIELDS = ["price_moto", "price_auto", "price_camioneta", "price_combi", "price_camion"]


class ServiceSerializer(BusinessScopedSerializerMixin, EconomyFieldsMixin, serializers.ModelSerializer):
    economy_fields = ["base_price", *PRICE_BY_TYPE_FIELDS]

    class Meta:
        model = Service
        fields = [
            "id",
            "name",
            "icon",
            "service_type",
            "base_price",
            *PRICE_BY_TYPE_FIELDS,
            "estimated_duration_minutes",
            "is_active",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_base_price(self, value):
        if value < 0:
            raise serializers.ValidationError("El precio no puede ser negativo.")
        return value

    def validate(self, attrs):
        errors = {
            field: "El precio no puede ser negativo."
            for field in PRICE_BY_TYPE_FIELDS
            if attrs.get(field) is not None and attrs[field] < 0
        }
        if errors:
            raise serializers.ValidationError(errors)
        return attrs
