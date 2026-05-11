from django.core.exceptions import DisallowedHost
from rest_framework import permissions

from core.models import BusinessProfile, UserProfile


EMPLOYER_ROLE = "empleador"
EMPLOYEE_ROLE = "empleado"
ROLE_GROUPS = [EMPLOYER_ROLE, EMPLOYEE_ROLE]


def can_view_economy(user):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
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


def user_context_payload(user, request=None):
    profile = UserProfile.for_user(user)
    business_profile = BusinessProfile.get_solo()
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
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
    }


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
