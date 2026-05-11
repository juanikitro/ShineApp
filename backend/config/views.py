import json
from pathlib import Path

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import Group, update_last_login
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import DisallowedHost
from django.db import transaction
from rest_framework import parsers, permissions, serializers, status
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import (
    BusinessProfile,
    UserProfile,
    normalize_expense_category_tree,
    normalize_income_category_tree,
)
from core.permissions import EMPLOYEE_ROLE, EmployerOnly, can_view_economy, user_context_payload


ALLOWED_PROFILE_ASSET_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "svg", "pdf"}
ALLOWED_PROFILE_ASSET_CONTENT_TYPES = {"application/pdf"}


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
    password = serializers.CharField(write_only=True, min_length=4)

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
        user = user_model.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )
        user.groups.set([employee_group])
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
            "contact_phone",
            "contact_email",
            "address",
            "default_quote_validity_days",
            "default_quote_tax_rate",
            "default_quote_discount_rate",
            "default_quote_terms",
            "default_quote_payment_instructions",
            "use_reservation_times",
            "show_stay_days_in_agenda",
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
        update_last_login(None, user)
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                "token": token.key,
                "user": user_context_payload(user, request=request),
            }
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
                business_profile = BusinessProfile.get_solo()
                business_profile.subscription_type = validated_data["subscription_type"]
                business_profile.save()

        return Response(user_context_payload(request.user, request=request))


class EmployeeUsersView(APIView):
    permission_classes = [EmployerOnly]

    def get_queryset(self):
        user_model = get_user_model()
        return (
            user_model.objects.filter(groups__name=EMPLOYEE_ROLE, is_superuser=False)
            .exclude(groups__name="empleador")
            .order_by("username")
            .distinct()
        )

    def get(self, request):
        serializer = EmployeeUserSerializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = EmployeeUserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(EmployeeUserSerializer(user).data, status=status.HTTP_201_CREATED)


class BusinessProfileView(APIView):
    permission_classes = [EmployerOnly]
    parser_classes = [
        parsers.MultiPartParser,
        parsers.FormParser,
        parsers.JSONParser,
    ]

    def get_profile(self):
        return BusinessProfile.get_solo()

    def get(self, request):
        serializer = BusinessProfileSerializer(
            self.get_profile(),
            context={"request": request},
        )
        return Response(serializer.data)

    def patch(self, request):
        serializer = BusinessProfileSerializer(
            self.get_profile(),
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
