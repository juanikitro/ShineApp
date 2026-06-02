import json
import secrets
from datetime import timedelta
from pathlib import Path

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import Group, update_last_login
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import DisallowedHost, ValidationError as DjangoValidationError
from django.db import connection, transaction
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import parsers, permissions, serializers, status
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

from core.audit import audit_snapshot, record_audit_event
from core.models import (
    BusinessAccount,
    BusinessProfile,
    PasswordResetToken,
    UserProfile,
    normalize_expense_category_tree,
    normalize_income_category_tree,
)
from core.permissions import EMPLOYEE_ROLE, EMPLOYER_ROLE, EmployerOnly, can_view_economy, user_context_payload
from core.permissions import business_for_user, business_from_request
from notifications.service import send_password_reset_email, send_trial_welcome_email


ALLOWED_PROFILE_ASSET_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "svg", "pdf"}
ALLOWED_PROFILE_ASSET_CONTENT_TYPES = {"application/pdf"}


def user_account_audit_snapshot(user):
    payload = audit_snapshot(user)
    profile = UserProfile.for_user(user)
    business_profile = BusinessProfile.get_solo(business=profile.business)
    payload.update(
        {
            "phone_country_code": profile.phone_country_code,
            "phone_number": profile.phone_number,
            "avatar": profile.avatar.name or None,
            "subscription_type": business_profile.subscription_type,
        }
    )
    return payload


def validate_profile_asset_upload(value):
    content_type = (getattr(value, "content_type", "") or "").lower()
    extension = Path(getattr(value, "name", "")).suffix.lower().lstrip(".")
    if content_type.startswith("image/"):
        return value
    if content_type in ALLOWED_PROFILE_ASSET_CONTENT_TYPES:
        return value
    if extension in ALLOWED_PROFILE_ASSET_EXTENSIONS:
        return value
    raise serializers.ValidationError(
        "El archivo debe ser una imagen o PDF valido.",
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


class HealthCheckView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, _request):
        checks = {"app": "ok", "database": "ok"}
        try:
            connection.ensure_connection()
        except Exception:
            checks["database"] = "error"
            return Response(
                {"status": "error", "checks": checks},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({"status": "ok", "checks": checks})


class PasswordResetRequestView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        SAFE_RESPONSE = Response(
            {"detail": "Si el email existe, recibirás un link."},
            status=status.HTTP_200_OK,
        )
        if not email:
            return SAFE_RESPONSE
        user_model = get_user_model()
        try:
            user = user_model.objects.get(email__iexact=email)
        except user_model.DoesNotExist:
            return SAFE_RESPONSE
        token_value = secrets.token_urlsafe(48)
        expires_at = timezone.now() + timedelta(hours=1)
        PasswordResetToken.objects.create(
            user=user,
            token=token_value,
            expires_at=expires_at,
        )
        send_password_reset_email(user.email, token_value)
        return SAFE_RESPONSE


class PasswordResetConfirmView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token_value = str(request.data.get("token", "")).strip()
        new_password = str(request.data.get("new_password", ""))
        if not token_value:
            return Response(
                {"token": ["Token inválido o vencido."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            reset_token = PasswordResetToken.objects.select_related("user").get(token=token_value)
        except PasswordResetToken.DoesNotExist:
            return Response(
                {"token": ["Token inválido o vencido."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not reset_token.is_valid():
            return Response(
                {"token": ["Token inválido o vencido."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(new_password) < 8:
            return Response(
                {"new_password": ["La contraseña debe tener al menos 8 caracteres."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            validate_password(new_password, user=reset_token.user)
        except DjangoValidationError as exc:
            return Response(
                {"new_password": list(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = reset_token.user
        user.set_password(new_password)
        user.save(update_fields=["password"])
        reset_token.used = True
        reset_token.save(update_fields=["used"])
        return Response({"detail": "Contraseña actualizada."}, status=status.HTTP_200_OK)


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
            "public_landing_enabled",
            "public_landing_intro",
            "allow_public_booking_requests",
            "allow_public_quote_requests",
            "income_category_tree",
            "expense_category_tree",
        ]

    def get_logo_url(self, obj):
        if not obj.logo:
            return None
        request = self.context.get("request")
        if request is None:
            return obj.logo.url
        try:
            return request.build_absolute_uri(obj.logo.url)
        except DisallowedHost:
            return obj.logo.url

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
    subscription_type = serializers.ChoiceField(
        choices=BusinessProfile.SubscriptionType.choices,
        required=False,
    )

    def validate_avatar(self, value):
        return validate_profile_asset_upload(value)

    def validate_phone_number(self, value):
        return value.strip()

    def validate_email(self, value):
        return value.strip()


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            username=serializer.validated_data["username"],
            password=serializer.validated_data["password"],
        )
        if user is None:
            return Response({"detail": "Credenciales invalidas."}, status=status.HTTP_400_BAD_REQUEST)
        if user.is_staff or user.is_superuser:
            return Response(
                {"detail": "El superadmin debe acceder desde Django admin."},
                status=status.HTTP_403_FORBIDDEN,
            )
        business = business_for_user(user, create_missing=False)
        if business is None or not business.is_active:
            return Response(
                {"detail": "El negocio no esta activo."},
                status=status.HTTP_403_FORBIDDEN,
            )
        update_last_login(None, user)
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                "token": token.key,
                "user": user_context_payload(user, request=request),
            }
        )


class TrialSignupView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = TrialSignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        owner_email = serializer.validated_data["email"]
        business_name = serializer.validated_data["business_name"]
        user = serializer.save()
        update_last_login(None, user)
        token, _ = Token.objects.get_or_create(user=user)
        send_trial_welcome_email(
            owner_email=owner_email,
            business_name=business_name,
        )
        return Response(
            {
                "token": token.key,
                "user": user_context_payload(user, request=request),
            },
            status=status.HTTP_201_CREATED,
        )


class LogoutView(APIView):
    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    parser_classes = [
        parsers.MultiPartParser,
        parsers.FormParser,
        parsers.JSONParser,
    ]

    def get(self, request):
        return Response(user_context_payload(request.user, request=request))

    def patch(self, request):
        serializer = MeUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data

        if "subscription_type" in validated_data and not can_view_economy(request.user):
            return Response(
                {"detail": EmployerOnly.message},
                status=status.HTTP_403_FORBIDDEN,
            )

        before = user_account_audit_snapshot(request.user)
        with transaction.atomic():
            profile = UserProfile.for_user(request.user)
            if "email" in validated_data:
                request.user.email = validated_data["email"]
                request.user.save(update_fields=["email"])
            if "avatar" in validated_data:
                profile.avatar = validated_data["avatar"]
            if "phone_country_code" in validated_data:
                profile.phone_country_code = validated_data["phone_country_code"]
            if "phone_number" in validated_data:
                profile.phone_number = validated_data["phone_number"]
            profile.save()

            if "subscription_type" in validated_data:
                business_profile = BusinessProfile.get_solo(business=profile.business)
                business_profile.subscription_type = validated_data["subscription_type"]
                business_profile.save()

        record_audit_event(
            request=request,
            action="update_profile",
            instance=request.user,
            before=before,
            after=user_account_audit_snapshot(request.user),
            module="auth",
            entity_type="User",
            entity_id=request.user.id,
            entity_label=request.user.get_username(),
        )
        return Response(user_context_payload(request.user, request=request))


class EmployeeUsersView(APIView):
    permission_classes = [EmployerOnly]

    def get_queryset(self):
        user_model = get_user_model()
        return (
            user_model.objects.filter(groups__name=EMPLOYEE_ROLE, is_superuser=False)
            .filter(profile__business=business_from_request(self.request))
            .exclude(groups__name="empleador")
            .order_by("username")
            .distinct()
        )

    def get(self, request):
        serializer = EmployeeUserSerializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = EmployeeUserCreateSerializer(
            data=request.data,
            context={"business": business_from_request(request)},
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        record_audit_event(
            request=request,
            action="create",
            instance=user,
            before=None,
            after=audit_snapshot(user),
            module="auth",
            entity_type="User",
            entity_id=user.id,
            entity_label=user.get_username(),
        )
        return Response(EmployeeUserSerializer(user).data, status=status.HTTP_201_CREATED)


class BusinessProfileView(APIView):
    permission_classes = [EmployerOnly]
    parser_classes = [
        parsers.MultiPartParser,
        parsers.FormParser,
        parsers.JSONParser,
    ]

    def get_profile(self):
        return BusinessProfile.get_solo(business=business_from_request(self.request))

    def get(self, request):
        serializer = BusinessProfileSerializer(
            self.get_profile(),
            context={"request": request},
        )
        return Response(serializer.data)

    def patch(self, request):
        profile = self.get_profile()
        before = audit_snapshot(profile)
        serializer = BusinessProfileSerializer(
            profile,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        record_audit_event(
            request=request,
            action="update",
            instance=profile,
            before=before,
            after=audit_snapshot(profile),
            module="settings",
        )
        return Response(serializer.data)
