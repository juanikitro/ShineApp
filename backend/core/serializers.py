from rest_framework import serializers

from .models import AuditLog
from .permissions import business_from_context, scope_queryset_to_business, validate_same_business


class BusinessScopedSerializerMixin:
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        business = self.get_business()
        if business is not None:
            self._scope_related_fields(self.fields, business)

    def get_business(self):
        return business_from_context(self.context)

    def validate_same_business(self, *objects):
        business = self.get_business()
        if business is None:
            for obj in objects:
                if obj is not None and getattr(obj, "business_id", None):
                    business = obj.business
                    break
        if business is None:
            return
        validate_same_business(business, *objects)

    def _scope_related_fields(self, fields, business):
        for field in fields.values():
            queryset = getattr(field, "queryset", None)
            if queryset is not None:
                field.queryset = scope_queryset_to_business(queryset, business)
            child = getattr(field, "child", None)
            if child is not None and hasattr(child, "fields"):
                self._scope_related_fields(child.fields, business)


class AuditLogSerializer(serializers.ModelSerializer):
    is_current_user = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "actor",
            "actor_username",
            "actor_email",
            "actor_role",
            "is_current_user",
            "action",
            "module",
            "entity_type",
            "entity_id",
            "entity_label",
            "before",
            "after",
            "changes",
            "metadata",
            "request_path",
            "request_method",
            "created_at",
        ]
        read_only_fields = fields

    def get_is_current_user(self, obj):
        request = self.context.get("request")
        return bool(
            request
            and request.user
            and request.user.is_authenticated
            and obj.actor_id == request.user.id
        )
