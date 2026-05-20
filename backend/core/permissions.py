import math

from django.core.exceptions import DisallowedHost
from django.utils import timezone
from rest_framework import permissions, serializers

from core.models import BusinessProfile, UserProfile


EMPLOYER_ROLE = "empleador"
EMPLOYEE_ROLE = "empleado"
ROLE_GROUPS = [EMPLOYER_ROLE, EMPLOYEE_ROLE]


def business_for_user(user, *, create_missing=True):
    if not user or not user.is_authenticated:
        return None
    if user.is_staff or user.is_superuser:
        return None
    try:
        profile = user.profile
    except (AttributeError, UserProfile.DoesNotExist):
        if not create_missing:
            return None
        profile = UserProfile.for_user(user)
    return profile.business


def business_from_request(request):
    return business_for_user(getattr(request, "user", None))


def business_from_context(context):
    request = context.get("request") if context else None
    if request is None:
        return None
    return business_from_request(request)


def user_has_active_business(user):
    business = business_for_user(user)
    return bool(business and business.is_active)


def scope_queryset_to_business(queryset, business):
    if business is None:
        return queryset.none()
    field_names = {field.name for field in queryset.model._meta.fields}
    if "business" not in field_names:
        return queryset
    return queryset.filter(business=business)


def validate_same_business(business, *objects):
    if business is None:
        raise serializers.ValidationError("El usuario no tiene un negocio activo.")
    for obj in objects:
        if obj is None or not hasattr(obj, "business_id"):
            continue
        if obj.business_id != business.id:
            raise serializers.ValidationError("El registro seleccionado pertenece a otro negocio.")


def can_view_economy(user):
    if not user or not user.is_authenticated:
        return False
    if not user_has_active_business(user):
        return False
    cached = getattr(user, "_shineapp_can_view_economy", None)
    if cached is not None:
        return cached
    allowed = user.groups.filter(name=EMPLOYER_ROLE).exists()
    setattr(user, "_shineapp_can_view_economy", allowed)
    return allowed


def get_user_role(user):
    return EMPLOYER_ROLE if can_view_economy(user) else EMPLOYEE_ROLE


def context_can_view_economy(context):
    request = context.get("request") if context else None
    if request is None:
        return True
    return can_view_economy(request.user)


def file_url(file_field, request=None):
    if not file_field:
        return None
    if request is None:
        return file_field.url
    try:
        return request.build_absolute_uri(file_field.url)
    except DisallowedHost:
        return file_field.url


def trial_days_remaining(trial_ends_at, *, now=None):
    if trial_ends_at is None:
        return None
    now = now or timezone.now()
    remaining_seconds = (trial_ends_at - now).total_seconds()
    if remaining_seconds <= 0:
        return 0
    return math.ceil(remaining_seconds / 86_400)


def trial_expired(trial_ends_at, *, now=None):
    if trial_ends_at is None:
        return False
    now = now or timezone.now()
    return trial_ends_at <= now


def user_context_payload(user, request=None):
    profile = UserProfile.for_user(user)
    business = profile.business
    business_profile = BusinessProfile.get_solo(business=business)
    now = timezone.now()
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "business": {
            "id": business.id,
            "name": business.name,
            "slug": business.slug,
            "is_active": business.is_active,
        },
        "role": get_user_role(user),
        "can_view_economy": can_view_economy(user),
        "is_active": user.is_active,
        "date_joined": user.date_joined,
        "last_login": user.last_login,
        "avatar_url": file_url(profile.avatar, request=request),
        "phone_country_code": profile.phone_country_code,
        "phone_number": profile.phone_number,
        "phone_display": profile.phone_display,
        "subscription_type": business_profile.subscription_type,
        "subscription_type_label": business_profile.get_subscription_type_display(),
        "trial_started_at": business_profile.trial_started_at,
        "trial_ends_at": business_profile.trial_ends_at,
        "trial_days_remaining": trial_days_remaining(business_profile.trial_ends_at, now=now),
        "trial_expired": trial_expired(business_profile.trial_ends_at, now=now),
    }


class ActiveBusinessUser(permissions.BasePermission):
    message = "El usuario no tiene un negocio activo."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_staff or user.is_superuser:
            self.message = "El superadmin debe acceder desde Django admin."
            return False
        if not user_has_active_business(user):
            self.message = "El negocio no esta activo."
            return False
        return True


class EconomyFieldsMixin:
    economy_fields = []

    def get_fields(self):
        fields = super().get_fields()
        if not context_can_view_economy(self.context):
            for field_name in self.economy_fields:
                fields.pop(field_name, None)
        return fields


class CanViewEconomy(permissions.BasePermission):
    message = "No tenes permisos para acceder a informacion economica."

    def has_permission(self, request, view):
        return can_view_economy(request.user)


class EmployerOnly(permissions.BasePermission):
    message = "No tenes permisos para administrar esta configuracion."

    def has_permission(self, request, view):
        return can_view_economy(request.user)


class EmployerRequiredForUnsafe(permissions.BasePermission):
    message = "No tenes permisos para modificar informacion economica."

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return can_view_economy(request.user)
