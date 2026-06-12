from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from core.permissions import business_from_context, can_view_economy
from core.serializers import BusinessScopedSerializerMixin

from .models import Task, TaskPriority, TaskStatus


class TaskSerializer(BusinessScopedSerializerMixin, serializers.ModelSerializer):
    assignee_username = serializers.CharField(source="assignee.username", read_only=True)
    assignee_label = serializers.SerializerMethodField()
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    completed_by_username = serializers.CharField(source="completed_by.username", read_only=True)
    priority_label = serializers.CharField(source="get_priority_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
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
        user = obj.assignee
        if user is None:
            return ""
        full_name = user.get_full_name().strip()
        return full_name or user.username

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

    def validate(self, attrs):
        request = self.context.get("request") if self.context else None
        user = getattr(request, "user", None) if request else None
        is_employer = can_view_economy(user) if user is not None else False

        if not is_employer:
            # El empleado siempre queda como assignee (al crear y al editar).
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

        return attrs
