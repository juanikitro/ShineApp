import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import update_last_login
from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import connection, transaction
from django.utils import timezone
from rest_framework import parsers, permissions, status
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

from core.audit import audit_snapshot, record_audit_event
from core.models import (
    BusinessProfile,
    PasswordResetToken,
    UserProfile,
)
from core.permissions import (
    EMPLOYEE_ROLE,
    EmployerOnly,
    business_for_user,
    business_from_request,
    can_view_economy,
    user_context_payload,
)
from notifications.service import send_password_reset_email, send_trial_welcome_email

from .serializers import (
    BusinessProfileSerializer,
    EmployeeUserCreateSerializer,
    EmployeeUserSerializer,
    EmployeeUserUpdateSerializer,
    LoginSerializer,
    MeUpdateSerializer,
    TrialSignupSerializer,
)


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


class HealthCheckView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, _request):
        import logging as _logging
        import os as _os

        from django.conf import settings as _settings
        storage_backend = _settings.STORAGES["default"]["BACKEND"]
        supabase_enabled_env = _os.environ.get("SUPABASE_STORAGE_ENABLED", "(not set)")
        _logging.getLogger("shineapp.health").warning(
            "[shineapp:health] storage_backend=%r supabase_enabled_env=%r",
            storage_backend,
            supabase_enabled_env,
        )
        checks = {
            "app": "ok",
            "database": "ok",
            "storage_backend": storage_backend,
            "supabase_enabled_env": supabase_enabled_env,
        }
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
    throttle_scope = "password_reset"

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
    throttle_scope = "password_reset"

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
        # Invalida tokens de API existentes: si la cuenta estaba comprometida, el
        # reset expulsa al atacante (antes el token robado seguia siendo valido).
        Token.objects.filter(user=user).delete()
        return Response({"detail": "Contraseña actualizada."}, status=status.HTTP_200_OK)


def login_lockout_key(username):
    return f"login_fail_{str(username).strip().lower()}"


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "login"

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data["username"]
        password = serializer.validated_data["password"]

        threshold = getattr(settings, "LOGIN_LOCKOUT_THRESHOLD", 0)
        window = getattr(settings, "LOGIN_LOCKOUT_WINDOW_SECONDS", 900)
        lock_key = login_lockout_key(username)
        if threshold and cache.get(lock_key, 0) >= threshold:
            return Response(
                {"detail": "Demasiados intentos fallidos. Proba de nuevo en unos minutos."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        user = authenticate(username=username, password=password)
        if user is None:
            # Cuenta solo credenciales invalidas (no el rechazo por negocio inactivo).
            if threshold:
                try:
                    cache.incr(lock_key)
                except ValueError:
                    cache.set(lock_key, 1, timeout=window)
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
        cache.delete(lock_key)
        update_last_login(None, user)
        token, created = Token.objects.get_or_create(user=user)
        if not created:
            # Refresca el reloj del token para alinear su expiracion con el TTL
            # del cliente en cada login (ver core/authentication.py).
            Token.objects.filter(pk=token.pk).update(created=timezone.now())
            token.refresh_from_db()
        return Response(
            {
                "token": token.key,
                "user": user_context_payload(user, request=request),
            }
        )


class TrialSignupView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    throttle_scope = "signup"

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
            if "push_subscription" in validated_data:
                profile.push_subscription = validated_data["push_subscription"]
            profile.save()

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


class EmployeeUserDetailView(APIView):
    permission_classes = [EmployerOnly]

    def _get_employee(self, request, pk):
        user_model = get_user_model()
        try:
            return (
                user_model.objects.filter(pk=pk, groups__name=EMPLOYEE_ROLE, is_superuser=False)
                .filter(profile__business=business_from_request(request))
                .exclude(groups__name="empleador")
                .distinct()
                .get()
            )
        except user_model.DoesNotExist:
            return None

    def get(self, request, pk):
        user = self._get_employee(request, pk)
        if user is None:
            return Response({"detail": "Empleado no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        return Response(EmployeeUserSerializer(user).data)

    def patch(self, request, pk):
        user = self._get_employee(request, pk)
        if user is None:
            return Response({"detail": "Empleado no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        serializer = EmployeeUserUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        password_changed = "password" in data
        before = audit_snapshot(user)

        update_fields = []
        if password_changed:
            user.set_password(data["password"])
            update_fields.append("password")
        if "email" in data:
            user.email = data["email"]
            update_fields.append("email")
        if "is_active" in data:
            user.is_active = data["is_active"]
            update_fields.append("is_active")

        if update_fields:
            with transaction.atomic():
                user.save(update_fields=update_fields)
                if password_changed:
                    Token.objects.filter(user=user).delete()
        record_audit_event(
            request=request,
            action="update",
            instance=user,
            before=before,
            after=audit_snapshot(user),
            module="auth",
            entity_type="User",
            entity_id=user.id,
            entity_label=user.get_username(),
        )
        return Response(EmployeeUserSerializer(user).data)


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
        from scheduling.services import realign_reservations_to_profile

        profile = self.get_profile()
        before = audit_snapshot(profile)
        previous_flags = {
            "reservation_use_pending": profile.reservation_use_pending,
            "reservation_use_in_progress": profile.reservation_use_in_progress,
            "reservation_use_ready": profile.reservation_use_ready,
            "reservation_use_canceled": profile.reservation_use_canceled,
        }
        serializer = BusinessProfileSerializer(
            profile,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        realignment = realign_reservations_to_profile(profile.business, profile, previous_flags)
        record_audit_event(
            request=request,
            action="update",
            instance=profile,
            before=before,
            after=audit_snapshot(profile),
            module="settings",
            metadata={"reservation_status_realignment": realignment} if realignment else None,
        )
        return Response(serializer.data)
