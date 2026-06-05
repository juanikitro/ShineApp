from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from rest_framework import serializers

from core.models import BusinessProfile
from core.permissions import context_can_view_economy
from core.serializers import BusinessScopedSerializerMixin

from .models import (
    DETAILING_BUCKET,
    WASH_BUCKET,
    DailyCapacity,
    Reservation,
    ReservationItem,
    bucket_for_service_type,
)
from .services import ensure_reservation_work_order


class DailyCapacitySerializer(BusinessScopedSerializerMixin, serializers.ModelSerializer):
    used_slots_wash = serializers.SerializerMethodField()
    used_slots_detailing = serializers.SerializerMethodField()
    available_slots_wash = serializers.SerializerMethodField()
    available_slots_detailing = serializers.SerializerMethodField()

    class Meta:
        model = DailyCapacity
        fields = [
            "id",
            "day",
            "max_slots_wash",
            "max_slots_detailing",
            "notes",
            "used_slots_wash",
            "used_slots_detailing",
            "available_slots_wash",
            "available_slots_detailing",
        ]
        read_only_fields = [
            "id",
            "used_slots_wash",
            "used_slots_detailing",
            "available_slots_wash",
            "available_slots_detailing",
        ]

    def get_used_slots_wash(self, obj):
        return Reservation.used_slots_for_day(obj.day, business=obj.business, bucket=WASH_BUCKET)

    def get_used_slots_detailing(self, obj):
        return Reservation.used_slots_for_day(obj.day, business=obj.business, bucket=DETAILING_BUCKET)

    def get_available_slots_wash(self, obj):
        return max(obj.max_slots_wash - self.get_used_slots_wash(obj), 0)

    def get_available_slots_detailing(self, obj):
        return max(obj.max_slots_detailing - self.get_used_slots_detailing(obj), 0)


class ReservationItemSerializer(BusinessScopedSerializerMixin, serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name", read_only=True)
    service_icon = serializers.CharField(source="service.icon", read_only=True)
    service_notes = serializers.CharField(source="service.notes", read_only=True)

    class Meta:
        model = ReservationItem
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


class ReservationSerializer(BusinessScopedSerializerMixin, serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    vehicle_label = serializers.SerializerMethodField()
    service_name = serializers.SerializerMethodField()
    service_icon = serializers.CharField(source="service.icon", read_only=True)
    items = ReservationItemSerializer(many=True, required=False)
    work_order = serializers.SerializerMethodField()
    status = serializers.CharField(required=False)

    class Meta:
        model = Reservation
        fields = [
            "id",
            "customer",
            "customer_name",
            "vehicle",
            "vehicle_label",
            "service",
            "service_name",
            "service_icon",
            "items",
            "day",
            "exit_day",
            "start_time",
            "exit_time",
            "estimated_duration_minutes",
            "status",
            "notes",
            "work_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "customer_name",
            "vehicle_label",
            "service_name",
            "service_icon",
            "work_order",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "service": {"required": False},
        }

    def get_vehicle_label(self, obj):
        return str(obj.vehicle)

    def get_service_name(self, obj):
        return obj.service_names_display

    def get_work_order(self, obj):
        try:
            order = obj.work_order
        except (AttributeError, ObjectDoesNotExist):
            return None

        payload = {
            "id": order.id,
            "reservation": obj.id,
            "customer": order.customer_id,
            "customer_name": order.customer.name,
            "vehicle": order.vehicle_id,
            "vehicle_label": str(order.vehicle),
            "service": order.service_id,
            "service_name": order.service.name,
            "service_icon": order.service.icon,
            "status": obj.status,
            "internal_notes": order.internal_notes,
            "received_at": order.received_at.isoformat() if order.received_at else None,
            "estimated_delivery_at": (
                order.estimated_delivery_at.isoformat() if order.estimated_delivery_at else None
            ),
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "updated_at": order.updated_at.isoformat() if order.updated_at else None,
        }
        if context_can_view_economy(self.context):
            metrics = self.context.get("work_order_financial_metrics_map", {}).get(order.id)
            payload.update(
                {
                    "total_amount": str(order.total_amount),
                    "paid_amount": str(
                        metrics["paid_amount"] if metrics else order.paid_amount
                    ),
                    "balance_due": str(
                        metrics["balance_due"] if metrics else order.balance_due
                    ),
                    "material_cost": str(
                        metrics["material_cost"] if metrics else order.material_cost
                    ),
                }
            )
        return payload

    def validate_status(self, value):
        if value == "completed":
            value = Reservation.Status.DELIVERED
        allowed = [choice[0] for choice in Reservation.Status.choices]
        if value not in allowed:
            raise serializers.ValidationError("Estado invalido.")
        profile = self._profile_for_validation()
        if profile is None:
            return value
        normalized = Reservation.normalize_status_for_profile(value, profile)
        if normalized is None:
            raise serializers.ValidationError(
                "Este estado esta deshabilitado en la configuracion del negocio."
            )
        return normalized

    def _profile_for_validation(self):
        business = self.get_business() or getattr(self.instance, "business", None)
        if business is None:
            return None
        return BusinessProfile.get_solo(business=business)

    def validate(self, attrs):
        attrs = self._with_preserved_exit_offset(attrs)
        attrs = self._with_legacy_service_items(attrs)
        items_data = attrs.get("items")
        customer = attrs.get("customer") or getattr(self.instance, "customer", None)
        vehicle = attrs.get("vehicle") or getattr(self.instance, "vehicle", None)
        service = attrs.get("service") or getattr(self.instance, "service", None)
        day = attrs["day"] if "day" in attrs else getattr(self.instance, "day", None)
        exit_day = attrs["exit_day"] if "exit_day" in attrs else getattr(self.instance, "exit_day", None)
        start_time = (
            attrs["start_time"]
            if "start_time" in attrs
            else getattr(self.instance, "start_time", None)
        )
        exit_time = (
            attrs["exit_time"]
            if "exit_time" in attrs
            else getattr(self.instance, "exit_time", None)
        )
        status = attrs.get("status") or getattr(self.instance, "status", Reservation.Status.PENDING)

        if items_data is not None:
            if not items_data:
                raise serializers.ValidationError({"items": "Agrega al menos un servicio."})
            for item_data in items_data:
                item_service = item_data.get("service")
                if not item_service:
                    raise serializers.ValidationError({"items": "Cada item debe indicar un servicio."})
                if not item_service.is_active:
                    raise serializers.ValidationError("No se puede reservar un servicio inactivo.")
                self.validate_same_business(item_service)
            service = items_data[0]["service"]

        self.validate_same_business(customer, vehicle, service)
        if not self.instance and not service:
            raise serializers.ValidationError({"service": "Este campo es requerido."})
        if vehicle and customer and vehicle.customer_id != customer.id:
            raise serializers.ValidationError("El vehiculo seleccionado no pertenece al cliente.")
        if customer and not customer.is_active:
            raise serializers.ValidationError("No se puede reservar para un cliente inactivo.")
        if vehicle and not vehicle.is_active:
            raise serializers.ValidationError("No se puede reservar un vehiculo inactivo.")
        if service and not service.is_active:
            raise serializers.ValidationError("No se puede reservar un servicio inactivo.")
        if day and exit_day and exit_day < day:
            raise serializers.ValidationError({"exit_day": "La fecha de egreso no puede ser anterior al ingreso."})
        if (
            day
            and start_time
            and exit_time
            and (not exit_day or exit_day == day)
            and exit_time < start_time
        ):
            raise serializers.ValidationError(
                {
                    "exit_time": (
                        "La hora de egreso no puede ser anterior a la hora de ingreso."
                    )
                }
            )
        if day and status in Reservation.active_statuses() and service:
            business = self.get_business() or getattr(self.instance, "business", None)
            bucket = bucket_for_service_type(getattr(service, "service_type", None))
            used_slots = Reservation.used_slots_for_day(
                day,
                exclude_id=getattr(self.instance, "id", None),
                business=business,
                bucket=bucket,
            )
            if used_slots >= Reservation.capacity_for_day(day, business=business, bucket=bucket):
                bucket_label = "detailing" if bucket == DETAILING_BUCKET else "lavado"
                raise serializers.ValidationError(
                    {"day": f"La capacidad de turnos de {bucket_label} para este dia ya esta completa."}
                )
        return attrs

    def _with_preserved_exit_offset(self, attrs):
        if not self.instance or "day" not in attrs or "exit_day" in attrs:
            return attrs

        previous_day = getattr(self.instance, "day", None)
        previous_exit_day = getattr(self.instance, "exit_day", None)
        if previous_day and previous_exit_day and previous_exit_day >= previous_day:
            attrs["exit_day"] = attrs["day"] + (previous_exit_day - previous_day)
        return attrs

    def _with_legacy_service_items(self, attrs):
        if not self.instance or attrs.get("items") != []:
            return attrs

        service = attrs.get("service") or getattr(self.instance, "service", None)
        if service:
            attrs["items"] = [{"service": service}]
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items", None)
        if items_data is None:
            service = validated_data["service"]
            items_data = [{"service": service}]
        validated_data["service"] = items_data[0]["service"]
        validated_data.setdefault("estimated_duration_minutes", self._duration_from_items(items_data))
        if "status" not in validated_data:
            profile = self._profile_for_validation()
            if profile is not None:
                validated_data["status"] = Reservation.initial_status_for_profile(profile)
        reservation = Reservation.objects.create(**validated_data)
        self._replace_items(reservation, items_data)
        self._ensure_work_order(reservation)
        return reservation

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        legacy_service = validated_data.get("service") if items_data is None and "service" in validated_data else None
        if items_data is not None:
            validated_data["service"] = items_data[0]["service"]
            validated_data.setdefault("estimated_duration_minutes", self._duration_from_items(items_data))
        reservation = super().update(instance, validated_data)
        if items_data is not None:
            self._replace_items(reservation, items_data)
        elif legacy_service:
            self._replace_items(reservation, [{"service": legacy_service}])
        self._ensure_work_order(reservation)
        return reservation

    def _ensure_work_order(self, reservation):
        ensure_reservation_work_order(reservation)
        reservation._state.fields_cache.pop("work_order", None)

    def _replace_items(self, reservation, items_data):
        reservation.items.all().delete()
        vehicle_type = getattr(reservation.vehicle, "vehicle_type", "")
        for item_data in items_data:
            ReservationItem.objects.create(
                reservation=reservation,
                **self._with_service_defaults(item_data, vehicle_type),
            )

    def _with_service_defaults(self, item_data, vehicle_type=""):
        item_data = dict(item_data)
        service = item_data.get("service")
        if service:
            if not item_data.get("description"):
                item_data["description"] = service.name
            item_data.setdefault("unit_price", service.price_for(vehicle_type))
        return item_data

    def _duration_from_items(self, items_data):
        total = 0
        for item_data in items_data:
            service = item_data.get("service")
            if not service:
                continue
            total += int(service.estimated_duration_minutes * item_data.get("quantity", 1))
        return max(total, 1)
