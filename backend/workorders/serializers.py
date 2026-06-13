from rest_framework import serializers

from core.permissions import EconomyFieldsMixin
from core.serializers import BusinessScopedSerializerMixin
from scheduling.models import Reservation

from .models import WorkOrder


class WorkOrderSerializer(BusinessScopedSerializerMixin, EconomyFieldsMixin, serializers.ModelSerializer):
    economy_fields = ["total_amount", "paid_amount", "balance_due", "material_cost"]

    customer_name = serializers.CharField(source="customer.name", read_only=True)
    vehicle_label = serializers.SerializerMethodField()
    service_name = serializers.CharField(source="service.name", read_only=True)
    service_icon = serializers.CharField(source="service.icon", read_only=True)
    status = serializers.CharField(required=False)
    paid_amount = serializers.SerializerMethodField()
    balance_due = serializers.SerializerMethodField()
    material_cost = serializers.SerializerMethodField()

    class Meta:
        model = WorkOrder
        fields = [
            "id",
            "reservation",
            "customer",
            "customer_name",
            "vehicle",
            "vehicle_label",
            "service",
            "service_name",
            "service_icon",
            "status",
            "total_amount",
            "paid_amount",
            "balance_due",
            "material_cost",
            "internal_notes",
            "received_at",
            "estimated_delivery_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "customer_name",
            "vehicle_label",
            "service_name",
            "service_icon",
            "paid_amount",
            "balance_due",
            "material_cost",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "customer": {"required": False},
            "vehicle": {"required": False},
            "service": {"required": False},
        }

    def get_vehicle_label(self, obj):
        return str(obj.vehicle)

    def get_financial_metric(self, obj, key, fallback):
        metrics = self.context.get("work_order_financial_metrics_map", {})
        if obj.id in metrics and key in metrics[obj.id]:
            return metrics[obj.id][key]
        return fallback()

    def decimal_representation(self, value):
        return serializers.DecimalField(
            max_digits=12,
            decimal_places=2,
            read_only=True,
        ).to_representation(value)

    def get_paid_amount(self, obj):
        return self.decimal_representation(
            self.get_financial_metric(obj, "paid_amount", lambda: obj.paid_amount)
        )

    def get_balance_due(self, obj):
        return self.decimal_representation(
            self.get_financial_metric(obj, "balance_due", lambda: obj.balance_due)
        )

    def get_material_cost(self, obj):
        return self.decimal_representation(
            self.get_financial_metric(obj, "material_cost", lambda: obj.material_cost)
        )

    def validate_status(self, value):
        if value == "completed":
            return Reservation.Status.DELIVERED
        allowed = [choice[0] for choice in Reservation.Status.choices]
        if value not in allowed:
            raise serializers.ValidationError("Estado invalido.")
        return value

    def validate_total_amount(self, value):
        # El empleador/empleado puede ajustar el precio de la orden (intencional),
        # pero nunca a un valor negativo.
        if value is not None and value < 0:
            raise serializers.ValidationError("El total no puede ser negativo.")
        return value

    def validate(self, attrs):
        reservation = attrs.get("reservation") or getattr(self.instance, "reservation", None)
        customer = attrs.get("customer") or getattr(self.instance, "customer", None)
        vehicle = attrs.get("vehicle") or getattr(self.instance, "vehicle", None)

        if not reservation:
            raise serializers.ValidationError(
                {"reservation": "Todo trabajo debe crearse desde una reserva."}
            )
        self.validate_same_business(reservation, customer, vehicle)

        if self.instance and "reservation" in attrs and attrs["reservation"] != self.instance.reservation:
            raise serializers.ValidationError(
                {"reservation": "La orden no se puede mover a otra reserva."}
            )

        customer = reservation.customer
        vehicle = reservation.vehicle
        attrs["customer"] = customer
        attrs["vehicle"] = vehicle
        attrs["service"] = reservation.service
        if customer and vehicle and vehicle.customer_id != customer.id:
            raise serializers.ValidationError("El vehiculo seleccionado no pertenece al cliente.")
        return attrs

    def create(self, validated_data):
        status = validated_data.pop("status", None)
        reservation = validated_data.get("reservation")
        if WorkOrder.objects.filter(reservation=reservation).exists():
            raise serializers.ValidationError(
                {"reservation": "La reserva ya tiene una orden de trabajo."}
            )
        validated_data.setdefault("total_amount", reservation.services_total)
        order = super().create(validated_data)
        if status:
            self._update_reservation_status(order, status)
        return order

    def update(self, instance, validated_data):
        status = validated_data.pop("status", None)
        order = super().update(instance, validated_data)
        if status:
            self._update_reservation_status(order, status)
        return order

    def _update_reservation_status(self, order, status):
        if order.reservation.status == status:
            return
        order.reservation.status = status
        order.reservation.save(update_fields=["status", "updated_at"])
