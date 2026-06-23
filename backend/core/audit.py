from datetime import date, datetime, time
from decimal import Decimal

from django.db import models, transaction
from django.db.models.fields.files import FieldFile
from django.utils.functional import Promise

from .models import AuditLog
from .permissions import business_for_user, get_user_role

REDACTED_VALUE = "[redacted]"
SENSITIVE_FIELD_MARKERS = (
    "password",
    "token",
    "secret",
    "credential",
    "auth",
    "api_key",
    "private_key",
)


def is_sensitive_field(field_name):
    normalized = str(field_name or "").lower()
    return any(marker in normalized for marker in SENSITIVE_FIELD_MARKERS)


def serialize_audit_value(value, *, field_name=""):
    if is_sensitive_field(field_name):
        return REDACTED_VALUE
    if isinstance(value, FieldFile):
        return value.name or None
    if isinstance(value, models.Model):
        return value.pk
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, Promise):
        return str(value)
    if isinstance(value, dict):
        return {
            str(key): serialize_audit_value(item, field_name=str(key))
            for key, item in value.items()
        }
    if isinstance(value, (list, tuple, set)):
        return [serialize_audit_value(item) for item in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


def audit_snapshot(instance):
    if instance is None:
        return None
    payload = {}
    for field in instance._meta.concrete_fields:
        field_name = field.name
        value = getattr(instance, field.attname if field.is_relation else field_name)
        payload[field_name] = serialize_audit_value(value, field_name=field_name)
    return payload


def diff_snapshots(before, after):
    before_payload = before or {}
    after_payload = after or {}
    keys = sorted(set(before_payload) | set(after_payload))
    changes = {}
    for key in keys:
        before_value = before_payload.get(key)
        after_value = after_payload.get(key)
        if before_value != after_value:
            changes[key] = {"before": before_value, "after": after_value}
    return changes


def audit_entity_payload(instance):
    if instance is None:
        return {
            "module": "",
            "entity_type": "",
            "entity_id": "",
            "entity_label": "",
        }
    return {
        "module": instance._meta.app_label,
        "entity_type": instance.__class__.__name__,
        "entity_id": str(instance.pk or ""),
        "entity_label": str(instance)[:240],
    }


def request_payload(request):
    if request is None:
        return {"request_path": "", "request_method": ""}
    return {
        "request_path": request.get_full_path()[:500],
        "request_method": request.method,
    }


def actor_payload(user):
    if not user or not getattr(user, "is_authenticated", False):
        return {
            "business": None,
            "actor": None,
            "actor_username": "",
            "actor_email": "",
            "actor_role": "",
        }
    business = business_for_user(user, create_missing=False)
    return {
        "business": business,
        "actor": user,
        "actor_username": user.get_username(),
        "actor_email": getattr(user, "email", "") or "",
        "actor_role": get_user_role(user),
    }


def record_audit_event(
    *,
    request=None,
    action,
    instance=None,
    before=None,
    after=None,
    module=None,
    entity_type=None,
    entity_id=None,
    entity_label=None,
    metadata=None,
):
    entity = audit_entity_payload(instance)
    before_payload = before
    after_payload = after
    changes = diff_snapshots(before_payload, after_payload)
    if not changes and action in {"update", "delete", "create"}:
        return None

    user = getattr(request, "user", None)
    payload = {
        **actor_payload(user),
        **request_payload(request),
        "action": action,
        "module": module or entity["module"],
        "entity_type": entity_type or entity["entity_type"],
        "entity_id": str(entity_id if entity_id is not None else entity["entity_id"]),
        "entity_label": str(entity_label if entity_label is not None else entity["entity_label"])[:240],
        "before": before_payload,
        "after": after_payload,
        "changes": changes,
        "metadata": serialize_audit_value(metadata or {}),
    }

    def create_log():
        AuditLog.objects.create(**payload)

    transaction.on_commit(create_log)
    return payload


class AuditedModelViewSetMixin:
    audit_module = None
    audit_side_effects = ()

    def get_business(self):
        return business_for_user(self.request.user)

    def filter_queryset(self, queryset):
        business = self.get_business()
        if business is not None:
            field_names = {field.name for field in queryset.model._meta.fields}
            if "business" in field_names:
                queryset = queryset.filter(business=business)
        return super().filter_queryset(queryset)

    def get_audit_module(self, instance=None):
        if self.audit_module:
            return self.audit_module
        if instance is not None:
            return instance._meta.app_label
        queryset = getattr(self, "queryset", None)
        model = getattr(queryset, "model", None)
        return model._meta.app_label if model else ""

    def get_audit_metadata(self, action, instance):
        if not self.audit_side_effects:
            return {}
        return {"side_effects": list(self.audit_side_effects)}

    def perform_create(self, serializer):
        business = self.get_business()
        model = serializer.Meta.model
        if business is not None and any(field.name == "business" for field in model._meta.fields):
            instance = serializer.save(business=business)
        else:
            instance = serializer.save()
        record_audit_event(
            request=self.request,
            action="create",
            instance=instance,
            before=None,
            after=audit_snapshot(instance),
            module=self.get_audit_module(instance),
            metadata=self.get_audit_metadata("create", instance),
        )

    def perform_update(self, serializer):
        before = audit_snapshot(serializer.instance)
        instance = serializer.save()
        record_audit_event(
            request=self.request,
            action="update",
            instance=instance,
            before=before,
            after=audit_snapshot(instance),
            module=self.get_audit_module(instance),
            metadata=self.get_audit_metadata("update", instance),
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        before = audit_snapshot(instance)
        entity = audit_entity_payload(instance)
        response = super().destroy(request, *args, **kwargs)
        after = None
        if instance.pk:
            row_manager = getattr(instance.__class__, "all_objects", instance.__class__.objects)
            row = row_manager.filter(pk=instance.pk).first()
            if row is not None:
                after = audit_snapshot(row)
        record_audit_event(
            request=request,
            action="delete",
            instance=instance,
            before=before,
            after=after,
            module=self.get_audit_module(instance),
            entity_type=entity["entity_type"],
            entity_id=entity["entity_id"],
            entity_label=entity["entity_label"],
            metadata=self.get_audit_metadata("delete", instance),
        )
        return response
