"""Serializers de la app config: auth, signup, perfil y empleados.

Se movieron desde config/views.py para alinear config con la convencion del
resto de las apps (cada app tiene su serializers.py). Behavior-preserving.
Ver docs/registro/decisiones/2026-06-12-modulos-dominio-vs-serializers.md
"""

import json
from datetime import timedelta
from pathlib import Path

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import serializers

from catalog.sector_defaults import ensure_default_sectors
from core.models import (
    BusinessAccount,
    BusinessProfile,
    UserProfile,
    normalize_expense_category_tree,
    normalize_income_category_tree,
)
from core.permissions import EMPLOYEE_ROLE, EMPLOYER_ROLE, file_url

ALLOWED_PROFILE_ASSET_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "pdf"}
ALLOWED_PROFILE_ASSET_CONTENT_TYPES = {"application/pdf"}
ALLOWED_PROFILE_IMAGE_CONTENT_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
MAX_PROFILE_ASSET_BYTES = 5 * 1024 * 1024  # 5 MB
_ACTIVE_MARKUP_MARKERS = (b"<svg", b"<?xml", b"<!doctype html", b"<html", b"<script")


def _read_upload_head(value, size=1024):
    try:
        value.seek(0)
        head = value.read(size) or b""
    except (AttributeError, OSError, ValueError):
        head = b""
    finally:
        try:
            value.seek(0)
        except (AttributeError, OSError, ValueError):
            pass
    if isinstance(head, str):
        head = head.encode("utf-8", "ignore")
    return head


def _looks_like_active_markup(value):
    head = _read_upload_head(value).lstrip().lower()
    return any(marker in head for marker in _ACTIVE_MARKUP_MARKERS)


def validate_profile_asset_upload(value):
    size = getattr(value, "size", None)
    if size is not None and size > MAX_PROFILE_ASSET_BYTES:
        raise serializers.ValidationError(
            "El archivo supera el tamano maximo permitido (5 MB).",
        )
    content_type = (getattr(value, "content_type", "") or "").lower()
    extension = Path(getattr(value, "name", "")).suffix.lower().lstrip(".")
    if extension == "svg" or content_type == "image/svg+xml" or _looks_like_active_markup(value):
        raise serializers.ValidationError(
            "No se permiten archivos SVG ni HTML.",
        )
    is_pdf = extension == "pdf" or content_type in ALLOWED_PROFILE_ASSET_CONTENT_TYPES
    is_image = (
        extension in {"png", "jpg", "jpeg", "webp"}
        or content_type in ALLOWED_PROFILE_IMAGE_CONTENT_TYPES
    )
    if is_pdf or is_image:
        return value
    raise serializers.ValidationError(
        "El archivo debe ser una imagen (PNG/JPG/WEBP) o PDF valido.",
    )


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()


def unique_business_slug(name):
    base = slugify(name).strip("-") or "negocio"
    max_length = BusinessAccount._meta.get_field("slug").max_length
    base = base[:max_length].strip("-") or "negocio"
    candidate = base
    counter = 2
    while BusinessAccount.objects.filter(slug=candidate).exists():
        suffix = f"-{counter}"
        candidate = f"{base[: max_length - len(suffix)].strip('-')}{suffix}"
        counter += 1
    return candidate


def unique_username_from_email(email):
    user_model = get_user_model()
    max_length = user_model._meta.get_field("username").max_length
    base = email[:max_length] or "usuario"
    candidate = base
    counter = 2
    while user_model.objects.filter(username__iexact=candidate).exists():
        suffix = f"-{counter}"
        candidate = f"{base[: max_length - len(suffix)]}{suffix}"
        counter += 1
    return candidate


def split_owner_name(owner_name):
    parts = owner_name.split()
    if not parts:
        return "", ""
    return parts[0], " ".join(parts[1:])


class TrialSignupSerializer(serializers.Serializer):
    business_name = serializers.CharField(max_length=160)
    industry = serializers.CharField(max_length=120, required=False, allow_blank=True)
    business_industry = serializers.CharField(max_length=120, required=False, allow_blank=True, write_only=True)
    owner_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=60)
    city = serializers.CharField(max_length=120)
    country = serializers.CharField(max_length=120)
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_business_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("El negocio es obligatorio.")
        return name

    def validate_owner_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("El responsable es obligatorio.")
        return name

    def validate_email(self, value):
        email = get_user_model().objects.normalize_email(value).strip().lower()
        if get_user_model().objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Ya existe una cuenta con ese email.")
        return email

    def validate_phone(self, value):
        phone = value.strip()
        if not phone:
            raise serializers.ValidationError("El telefono es obligatorio.")
        return phone

    def validate_city(self, value):
        city = value.strip()
        if not city:
            raise serializers.ValidationError("La ciudad es obligatoria.")
        return city

    def validate_country(self, value):
        country = value.strip()
        if not country:
            raise serializers.ValidationError("El pais es obligatorio.")
        return country

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        industry = (attrs.get("industry") or attrs.get("business_industry") or "").strip()
        if not industry:
            raise serializers.ValidationError({"industry": "El rubro es obligatorio."})
        attrs["industry"] = industry
        attrs.pop("business_industry", None)
        return attrs

    def create(self, validated_data):
        user_model = get_user_model()
        now = timezone.now()
        trial_ends_at = now + timedelta(days=30)
        first_name, last_name = split_owner_name(validated_data["owner_name"])
        with transaction.atomic():
            business = BusinessAccount.objects.create(
                name=validated_data["business_name"],
                slug=unique_business_slug(validated_data["business_name"]),
                is_active=True,
            )
            BusinessProfile.objects.create(
                business=business,
                name=validated_data["business_name"],
                industry=validated_data["industry"],
                contact_phone=validated_data["phone"],
                contact_email=validated_data["email"],
                city=validated_data["city"],
                country=validated_data["country"],
                subscription_type=BusinessProfile.SubscriptionType.TRIAL,
                trial_started_at=now,
                trial_ends_at=trial_ends_at,
            )
            ensure_default_sectors(business)
            user = user_model.objects.create_user(
                username=unique_username_from_email(validated_data["email"]),
                email=validated_data["email"],
                password=validated_data["password"],
                first_name=first_name,
                last_name=last_name,
            )
            employer_group, _ = Group.objects.get_or_create(name=EMPLOYER_ROLE)
            user.groups.set([employer_group])
            UserProfile.objects.create(
                user=user,
                business=business,
                phone_number=validated_data["phone"],
            )
        return user


class EmployeeUserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    can_view_economy = serializers.SerializerMethodField()

    class Meta:
        model = get_user_model()
        fields = ["id", "username", "email", "is_active", "role", "can_view_economy", "date_joined", "last_login"]
        read_only_fields = fields

    def get_role(self, _user):
        return EMPLOYEE_ROLE

    def get_can_view_economy(self, _user):
        return False


class EmployeeUserCreateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_username(self, value):
        username = value.strip()
        if not username:
            raise serializers.ValidationError("El usuario es obligatorio.")
        user_model = get_user_model()
        if user_model.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError("Ya existe un usuario con ese nombre.")
        return username

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        user_model = get_user_model()
        employee_group, _ = Group.objects.get_or_create(name=EMPLOYEE_ROLE)
        business = self.context["business"]
        user = user_model.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )
        user.groups.set([employee_group])
        UserProfile.objects.create(user=user, business=business)
        return user


class EmployeeUserUpdateSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, min_length=8, required=False)
    email = serializers.EmailField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)

    def validate_password(self, value):
        validate_password(value)
        return value


def validate_category_tree_payload(value, normalizer):
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError as exc:
            raise serializers.ValidationError("Debe ser un JSON valido.") from exc
    if not isinstance(value, dict):
        raise serializers.ValidationError("Debe ser un objeto de categorias.")
    if not value:
        raise serializers.ValidationError("Debe cargar al menos una categoria.")

    for raw_category, raw_subcategories in value.items():
        category = str(raw_category).strip()
        if not category:
            raise serializers.ValidationError("La categoria no puede estar vacia.")
        if not isinstance(raw_subcategories, list):
            raise serializers.ValidationError(
                f"Las subcategorias de {category} deben ser una lista."
            )

        for raw_subcategory in raw_subcategories:
            subcategory = str(raw_subcategory).strip()
            if not subcategory:
                raise serializers.ValidationError(
                    f"{category} tiene una subcategoria vacia."
                )
        if not raw_subcategories:
            raise serializers.ValidationError(
                f"{category} necesita al menos una subcategoria."
            )

    normalized = normalizer(value)
    if not normalized:
        raise serializers.ValidationError("Debe cargar al menos una categoria.")
    return normalized


class BusinessProfileSerializer(serializers.ModelSerializer):
    cuit = serializers.CharField(required=False, allow_blank=True, max_length=32)
    income_category_tree = serializers.JSONField(required=False)
    expense_category_tree = serializers.JSONField(required=False)
    logo = serializers.FileField(required=False, allow_null=True, write_only=True)
    logo_url = serializers.SerializerMethodField()
    subscription_type_label = serializers.CharField(
        source="get_subscription_type_display",
        read_only=True,
    )
    trial_started_at = serializers.DateTimeField(read_only=True)
    trial_ends_at = serializers.DateTimeField(read_only=True)
    vat_condition_label = serializers.CharField(
        source="get_vat_condition_display",
        read_only=True,
    )

    class Meta:
        model = BusinessProfile
        fields = [
            "name",
            "logo",
            "logo_url",
            "cuit",
            "vat_condition",
            "vat_condition_label",
            "subscription_type",
            "subscription_type_label",
            "industry",
            "contact_phone",
            "contact_email",
            "city",
            "country",
            "address",
            "maps_url",
            "trial_started_at",
            "trial_ends_at",
            "default_quote_validity_days",
            "default_quote_tax_rate",
            "default_quote_discount_rate",
            "default_quote_terms",
            "default_quote_payment_instructions",
            "opening_time",
            "closing_time",
            "use_reservation_times",
            "show_stay_days_in_agenda",
            "allow_overlapping_reservations",
            "enforce_capacity_limit",
            "reservation_use_pending",
            "reservation_use_in_progress",
            "reservation_use_ready",
            "reservation_use_canceled",
            "public_landing_enabled",
            "public_landing_intro",
            "allow_public_booking_requests",
            "allow_public_quote_requests",
            "public_hidden_service_ids",
            "public_show_service_description",
            "public_show_service_price",
            "income_category_tree",
            "expense_category_tree",
        ]

    def get_logo_url(self, obj):
        return file_url(obj.logo, request=self.context.get("request"))

    def validate_logo(self, value):
        return validate_profile_asset_upload(value)

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("El nombre es obligatorio.")
        return name

    def validate_cuit(self, value):
        digits = "".join(character for character in str(value) if character.isdigit())
        if digits and len(digits) != 11:
            raise serializers.ValidationError("El CUIT debe tener 11 digitos.")
        return digits

    def validate_industry(self, value):
        return value.strip()

    def validate_city(self, value):
        return value.strip()

    def validate_country(self, value):
        return value.strip()

    def validate_address(self, value):
        return value.strip()

    def validate_maps_url(self, value):
        return value.strip()

    def validate_default_quote_validity_days(self, value):
        if value < 0:
            raise serializers.ValidationError("La validez no puede ser negativa.")
        return value

    def validate_default_quote_terms(self, value):
        return value.strip()

    def validate_default_quote_payment_instructions(self, value):
        return value.strip()

    def validate_public_landing_intro(self, value):
        return value.strip()

    def validate_public_hidden_service_ids(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Debe ser una lista de IDs.")
        cleaned = []
        seen = set()
        for raw in value:
            try:
                identifier = int(raw)
            except (TypeError, ValueError) as e:
                raise serializers.ValidationError(
                    "Solo se aceptan IDs numericos de servicios."
                ) from e
            if identifier <= 0 or identifier in seen:
                continue
            seen.add(identifier)
            cleaned.append(identifier)
        return cleaned

    def validate_income_category_tree(self, value):
        return validate_category_tree_payload(value, normalize_income_category_tree)

    def validate_expense_category_tree(self, value):
        return validate_category_tree_payload(value, normalize_expense_category_tree)


class MeUpdateSerializer(serializers.Serializer):
    avatar = serializers.FileField(required=False)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone_country_code = serializers.ChoiceField(
        choices=UserProfile.PhoneCountryCode.choices,
        required=False,
    )
    phone_number = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=32,
    )
    # subscription_type NO se acepta aca: el plan lo controla facturacion/admin
    # del lado servidor, no es auto-asignable por el usuario desde /me.
    push_subscription = serializers.JSONField(required=False, allow_null=True)

    def validate_avatar(self, value):
        return validate_profile_asset_upload(value)

    def validate_phone_number(self, value):
        return value.strip()

    def validate_email(self, value):
        return value.strip()

    def validate_push_subscription(self, value):
        if value is None:
            return None
        if not isinstance(value, dict) or not value.get("endpoint"):
            raise serializers.ValidationError("Formato de suscripcion invalido.")
        return value
