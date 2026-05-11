from rest_framework import serializers

from core.permissions import EconomyFieldsMixin

from .models import Service


class ServiceSerializer(EconomyFieldsMixin, serializers.ModelSerializer):
    economy_fields = ["base_price"]

    class Meta:
        model = Service
        fields = [
            "id",
            "name",
            "icon",
            "service_type",
            "base_price",
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
