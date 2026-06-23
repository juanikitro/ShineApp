from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from core.permissions import can_view_economy
from core.serializers import BusinessScopedSerializerMixin

from .models import Task, TaskPriority, TaskRecurrence, TaskStatus


def _user_display_label(user):
    if user is None:
        return ""
    full_name = user.get_full_name().strip()
    if full_name:
        return full_name
    username = user.username or ""
    if "@" in username:
        return username.split("@", 1)[0]
    return username


def _vehicle_display_label(vehicle):
    if vehicle is None:
        return ""
    plate = (vehicle.license_plate or "").strip()
    detail = " ".join(
        part for part in [(vehicle.brand or "").strip(), (vehicle.model or "").strip()] if part
    ).strip()
    if plate and detail:
        return f"{plate} - {detail}"
    return plate or detail or f"Vehiculo {vehicle.pk}"


class TaskSerializer(BusinessScopedSerializerMixin, serializers.ModelSerializer):
    assignee_username = serializers.CharField(source="assignee.username", read_only=True)
    assignee_label = serializers.SerializerMethodField()
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    created_by_label = serializers.SerializerMethodField()
    completed_by_username = serializers.CharField(source="completed_by.username", read_only=True)
    priority_label = serializers.CharField(source="get_priority_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    recurrence_label = serializers.CharField(source="get_recurrence_display", read_only=True)
    customer_label = serializers.SerializerMethodField()
    vehicle_label = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "due_date",
            "priority",
            "priority_label",
            "assignee",
            "assignee_username",
            "assignee_label",
            "created_by",
            "created_by_username",
            "created_by_label",
            "customer",
            "customer_label",
            "vehicle",
            "vehicle_label",
            "recurrence",
            "recurrence_label",
            "status",
            "status_label",
            "completed_at",
            "completed_by",
            "completed_by_username",
            "is_overdue",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "priority_label",
            "assignee_username",
            "assignee_label",
            "created_by",
            "created_by_username",
            "created_by_label",
            "customer_label",
            "vehicle_label",
            "recurrence_label",
            "status",
            "status_label",
            "completed_at",
            "completed_by",
            "completed_by_username",
            "is_overdue",
            "created_at",
            "updated_at",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        business = self.get_business()
        if business is None:
            return
        user_model = get_user_model()
        assignee_field = self.fields.get("assignee")
        if assignee_field is not None:
            assignee_field.queryset = user_model.objects.filter(
                profile__business=business,
                is_active=True,
            ).distinct()

    def get_assignee_label(self, obj):
        return _user_display_label(obj.assignee)

    def get_created_by_label(self, obj):
        return _user_display_label(obj.created_by)

    def get_customer_label(self, obj):
        if obj.customer_id is None:
            return ""
        return obj.customer.name or ""

    def get_vehicle_label(self, obj):
        if obj.vehicle_id is None:
            return ""
        return _vehicle_display_label(obj.vehicle)

    def get_is_overdue(self, obj):
        if obj.status == TaskStatus.DONE:
            return False
        if obj.due_date is None:
            return False
        return obj.due_date < timezone.localdate()

    def validate_title(self, value):
        title = (value or "").strip()
        if not title:
            raise serializers.ValidationError("El titulo es obligatorio.")
        return title

    def validate_priority(self, value):
        if value not in TaskPriority.values:
            raise serializers.ValidationError("Prioridad invalida.")
        return value

    def validate_recurrence(self, value):
        if not value:
            return TaskRecurrence.NONE
        if value not in TaskRecurrence.values:
            raise serializers.ValidationError("Recurrencia invalida.")
        return value

    def validate(self, attrs):
        request = self.context.get("request") if self.context else None
        user = getattr(request, "user", None) if request else None
        is_employer = can_view_economy(user) if user is not None else False

        if not is_employer:
            if user is not None and user.is_authenticated:
                attrs["assignee"] = user

        assignee = attrs.get("assignee", getattr(self.instance, "assignee", None))
        business = self.get_business()
        if assignee is not None and business is not None:
            profile = getattr(assignee, "profile", None)
            if profile is None or profile.business_id != business.id:
                raise serializers.ValidationError(
                    {"assignee": "El usuario seleccionado no pertenece a este negocio."}
                )

        customer = attrs.get("customer", getattr(self.instance, "customer", None))
        if customer is not None and business is not None:
            if getattr(customer, "business_id", None) != business.id:
                raise serializers.ValidationError(
                    {"customer": "El cliente no pertenece a este negocio."}
                )

        vehicle = attrs.get("vehicle", getattr(self.instance, "vehicle", None))
        if vehicle is not None:
            if business is not None and getattr(vehicle, "business_id", None) != business.id:
                raise serializers.ValidationError(
                    {"vehicle": "El vehiculo no pertenece a este negocio."}
                )
            if customer is not None and vehicle.customer_id != customer.pk:
                raise serializers.ValidationError(
                    {"vehicle": "El vehiculo no corresponde al cliente seleccionado."}
                )

        if attrs.get("recurrence") and attrs["recurrence"] != TaskRecurrence.NONE:
            due_date = attrs.get("due_date", getattr(self.instance, "due_date", None))
            if due_date is None:
                raise serializers.ValidationError(
                    {"recurrence": "Una tarea recurrente necesita fecha de vencimiento."}
                )

        return attrs
