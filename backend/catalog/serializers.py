from rest_framework import serializers

from core.permissions import EconomyFieldsMixin
from core.serializers import BusinessScopedSerializerMixin

from .models import Sector, Service, ServiceMaterial


PRICE_BY_TYPE_FIELDS = ["price_moto", "price_auto", "price_camioneta", "price_combi", "price_camion"]


class SectorSerializer(BusinessScopedSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = Sector
        fields = [
            "id",
            "key",
            "name",
            "color",
            "icon",
            "order",
            "is_active",
            "default_capacity",
            "public_visible",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "key", "created_at", "updated_at"]

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("El nombre del sector es obligatorio.")
        return name

    def validate_default_capacity(self, value):
        if value < 0:
            raise serializers.ValidationError("La capacidad no puede ser negativa.")
        return value

    def validate(self, attrs):
        # No permitir desactivar el unico sector activo del negocio.
        if (
            self.instance is not None
            and attrs.get("is_active") is False
            and self.instance.is_active
        ):
            remaining = (
                Sector.objects.filter(business=self.instance.business, is_active=True)
                .exclude(pk=self.instance.pk)
                .count()
            )
            if remaining == 0:
                raise serializers.ValidationError(
                    {"is_active": "No se puede desactivar el unico sector activo del negocio."}
                )
        return attrs


class ServiceMaterialSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source="material.name", read_only=True)
    material_unit = serializers.CharField(source="material.unit", read_only=True)

    class Meta:
        model = ServiceMaterial
        fields = ["id", "service", "material", "material_name", "material_unit", "quantity", "notes"]
        read_only_fields = ["id", "material_name", "material_unit"]

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("La cantidad debe ser mayor a cero.")
        return value


class ServiceSerializer(BusinessScopedSerializerMixin, EconomyFieldsMixin, serializers.ModelSerializer):
    economy_fields = ["base_price", *PRICE_BY_TYPE_FIELDS]
    materials = ServiceMaterialSerializer(many=True, read_only=True)

    class Meta:
        model = Service
        fields = [
            "id",
            "name",
            "icon",
            "sector",
            "base_price",
            *PRICE_BY_TYPE_FIELDS,
            "estimated_duration_minutes",
            "is_active",
            "notes",
            "materials",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "materials", "created_at", "updated_at"]

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
