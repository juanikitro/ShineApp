from django.conf import settings
from django.core.validators import FileExtensionValidator, MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

PROFILE_ASSET_FILE_VALIDATOR = FileExtensionValidator(
    allowed_extensions=["png", "jpg", "jpeg", "webp", "svg", "pdf"],
)


class VehicleType(models.TextChoices):
    MOTO = "moto", "Moto"
    AUTO = "auto", "Auto"
    CAMIONETA = "camioneta", "Camioneta"
    COMBI = "combi", "Combi"
    CAMION = "camion", "Camion"


def default_expense_category_tree():
    return {
        "Alquiler": ["Local", "Deposito", "Cochera"],
        "Inversion": [
            "Herramientas",
            "Maquinarias",
            "Remodelaciones",
            "Equipamiento",
            "Tecnologia",
        ],
        "Servicios": [
            "Agua",
            "Alquiler",
            "Comida",
            "Gas",
            "Internet",
            "Luz",
            "Sueldo",
            "Telefono",
        ],
        "Materiales e insumos": [
            "Shampoo",
            "Ceras",
            "Abrillantadores",
            "Panos",
            "Microfibras",
            "Quimicos",
            "Descartables",
            "Compra de materiales",
        ],
        "Mantenimiento": ["Equipos", "Local", "Vehiculos", "Repuestos"],
        "Impuestos y tasas": ["Monotributo", "IVA", "Municipal", "Bancarios"],
        "Administracion": ["Contador", "Software", "Papeleria", "Limpieza"],
        "Marketing y ventas": ["Publicidad", "Promociones", "Carteleria"],
        "Personal": [
            "Comida",
            "Transporte",
            "Salud",
            "Entretenimiento",
            "Ropa",
            "Hogar",
            "Educacion",
            "Cuidado personal",
            "Suscripciones",
            "Mascotas",
            "Viajes",
            "Otros",
        ],
        "Deudas": ["Pago de deuda", "Otros"],
        "Ajustes": ["Ajuste de cierre", "Diferencia de caja"],
        "Otros": ["General"],
    }


def default_income_category_tree():
    return {
        "Pago": ["Efectivo", "Tarjeta", "Transferencia", "Otro"],
        "Sena": ["Efectivo", "Tarjeta", "Transferencia", "Otro"],
        "Adelanto": ["Efectivo", "Tarjeta", "Transferencia", "Otro"],
        "Prestamo": ["General"],
        "Inversion": ["Aporte de capital", "Aporte de socio"],
        "Venta": ["Efectivo", "Tarjeta", "Transferencia", "Otro"],
        "Pago de orden": ["Efectivo", "Tarjeta", "Transferencia", "Otro"],
        "Otros": ["General"],
    }


def normalize_category_tree(value, default_tree):
    source = value if isinstance(value, dict) else default_tree()
    normalized = {}
    sorted_source = sorted(
        source.items(),
        key=lambda item: str(item[0] or "").casefold(),
    )
    for raw_category, raw_subcategories in sorted_source:
        category = str(raw_category).strip()
        if not category or not isinstance(raw_subcategories, list):
            continue
        subcategories = []
        seen = set()
        for raw_subcategory in raw_subcategories:
            subcategory = str(raw_subcategory).strip()
            if subcategory and subcategory not in seen:
                subcategories.append(subcategory)
                seen.add(subcategory)
        if subcategories:
            normalized[category] = sorted(subcategories, key=str.casefold)
    return normalized or default_tree()


def normalize_expense_category_tree(value):
    return normalize_category_tree(value, default_expense_category_tree)


def normalize_income_category_tree(value):
    return normalize_category_tree(value, default_income_category_tree)


def tree_with_classification(tree, category, subcategory, normalizer):
    category = str(category or "").strip()
    subcategory = str(subcategory or "").strip()
    normalized = normalizer(tree)
    if not category or not subcategory:
        return normalized
    current = normalized.get(category, [])
    if subcategory not in current:
        normalized[category] = [*current, subcategory]
    return normalizer(normalized)


def tree_with_expense_classification(tree, category, subcategory):
    return tree_with_classification(
        tree,
        category,
        subcategory,
        normalize_expense_category_tree,
    )


def tree_with_income_classification(tree, category, subcategory):
    return tree_with_classification(
        tree,
        category,
        subcategory,
        normalize_income_category_tree,
    )


def register_profile_classification(
    category,
    subcategory,
    *,
    field_name,
    tree_builder,
    business=None,
):
    category = str(category or "").strip()
    subcategory = str(subcategory or "").strip()
    if not category or not subcategory:
        return
    profile = BusinessProfile.get_solo(business=business)
    current_tree = getattr(profile, field_name)
    next_tree = tree_builder(
        current_tree,
        category,
        subcategory,
    )
    if next_tree != current_tree:
        setattr(profile, field_name, next_tree)
        profile.save(update_fields=[field_name, "updated_at"])


def register_expense_classification(category, subcategory, *, business=None):
    register_profile_classification(
        category,
        subcategory,
        field_name="expense_category_tree",
        tree_builder=tree_with_expense_classification,
        business=business,
    )


def register_income_classification(category, subcategory, *, business=None):
    register_profile_classification(
        category,
        subcategory,
        field_name="income_category_tree",
        tree_builder=tree_with_income_classification,
        business=business,
    )


class BusinessAccount(models.Model):
    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=80, unique=True)
    is_active = models.BooleanField(default=True)
    deactivated_at = models.DateTimeField(null=True, blank=True)
    deactivation_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "negocio"
        verbose_name_plural = "negocios"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.name = self.name.strip()
        if not self.slug:
            self.slug = slugify(self.name) or "negocio"
        self.slug = slugify(self.slug)
        super().save(*args, **kwargs)

    @classmethod
    def get_default(cls):
        business, _ = cls.objects.get_or_create(
            slug="default",
            defaults={"name": getattr(settings, "BUSINESS_NAME", "ShineApp")},
        )
        return business

    def deactivate(self, reason=""):
        self.is_active = False
        self.deactivated_at = timezone.now()
        self.deactivation_reason = str(reason or "").strip()
        self.save(update_fields=["is_active", "deactivated_at", "deactivation_reason", "updated_at"])
        self.invalidate_user_tokens()

    def reactivate(self):
        self.is_active = True
        self.deactivated_at = None
        self.deactivation_reason = ""
        self.save(update_fields=["is_active", "deactivated_at", "deactivation_reason", "updated_at"])

    def invalidate_user_tokens(self):
        from rest_framework.authtoken.models import Token

        user_ids = self.user_profiles.values_list("user_id", flat=True)
        Token.objects.filter(user_id__in=user_ids).delete()


class BusinessProfile(models.Model):
    class SubscriptionType(models.TextChoices):
        TRIAL = "trial", "Prueba"
        PREMIUM = "premium", "Premium"

    class VatCondition(models.TextChoices):
        RESPONSABLE_INSCRIPTO = "responsable_inscripto", "Responsable inscripto"
        MONOTRIBUTO = "monotributo", "Monotributo"
        EXENTO = "exento", "Exento"
        CONSUMIDOR_FINAL = "consumidor_final", "Consumidor final"

    business = models.OneToOneField(
        BusinessAccount,
        related_name="profile",
        on_delete=models.CASCADE,
    )
    name = models.CharField(max_length=160, default=settings.BUSINESS_NAME)
    logo = models.FileField(
        upload_to="business-profile/",
        blank=True,
        validators=[PROFILE_ASSET_FILE_VALIDATOR],
    )
    cuit = models.CharField(max_length=11, blank=True)
    vat_condition = models.CharField(
        max_length=32,
        choices=VatCondition.choices,
        blank=True,
    )
    subscription_type = models.CharField(
        max_length=16,
        choices=SubscriptionType.choices,
        default=SubscriptionType.TRIAL,
    )
    industry = models.CharField(max_length=120, blank=True)
    contact_phone = models.CharField(max_length=60, blank=True)
    contact_email = models.EmailField(blank=True)
    city = models.CharField(max_length=120, blank=True)
    country = models.CharField(max_length=120, blank=True)
    address = models.CharField(max_length=220, blank=True)
    maps_url = models.URLField(max_length=500, blank=True)
    trial_started_at = models.DateTimeField(null=True, blank=True)
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    default_quote_validity_days = models.PositiveSmallIntegerField(default=7)
    default_quote_tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    default_quote_discount_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    default_quote_terms = models.TextField(blank=True)
    default_quote_payment_instructions = models.TextField(blank=True)
    opening_time = models.TimeField(null=True, blank=True)
    closing_time = models.TimeField(null=True, blank=True)
    use_reservation_times = models.BooleanField(default=True)
    show_stay_days_in_agenda = models.BooleanField(default=True)
    allow_overlapping_reservations = models.BooleanField(default=False)
    enforce_capacity_limit = models.BooleanField(default=True)
    reservation_use_pending = models.BooleanField(default=True)
    reservation_use_in_progress = models.BooleanField(default=True)
    reservation_use_ready = models.BooleanField(default=True)
    reservation_use_canceled = models.BooleanField(default=True)
    public_landing_enabled = models.BooleanField(default=True)
    public_landing_intro = models.CharField(max_length=240, blank=True)
    allow_public_booking_requests = models.BooleanField(default=True)
    allow_public_quote_requests = models.BooleanField(default=True)
    public_hidden_service_ids = models.JSONField(default=list, blank=True)
    public_show_service_description = models.BooleanField(default=True)
    public_show_service_price = models.BooleanField(default=False)
    income_category_tree = models.JSONField(
        default=default_income_category_tree,
        blank=True,
    )
    expense_category_tree = models.JSONField(
        default=default_expense_category_tree,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "perfil del negocio"
        verbose_name_plural = "perfil del negocio"

    def __str__(self):
        return self.name or "Negocio"

    @classmethod
    def get_solo(cls, business=None):
        business = business or BusinessAccount.get_default()
        profile, _ = cls.objects.get_or_create(
            business=business,
            defaults={"name": business.name or getattr(settings, "BUSINESS_NAME", "ShineApp")},
        )
        return profile

    @classmethod
    def current_business_name(cls, business=None):
        if business is not None:
            profile = cls.objects.only("name").filter(business=business).first()
        else:
            profile = cls.objects.only("name").order_by("id").first()
        if profile and profile.name:
            return profile.name
        return getattr(settings, "BUSINESS_NAME", "ShineApp")


class BusinessHours(models.Model):
    DAY_CHOICES = [
        (0, "Lunes"),
        (1, "Martes"),
        (2, "Miercoles"),
        (3, "Jueves"),
        (4, "Viernes"),
        (5, "Sabado"),
        (6, "Domingo"),
    ]

    business = models.ForeignKey(
        BusinessAccount,
        on_delete=models.CASCADE,
        related_name="working_hours",
    )
    day_of_week = models.SmallIntegerField(choices=DAY_CHOICES)
    is_open = models.BooleanField(default=True)
    opening_time = models.TimeField(null=True, blank=True)
    closing_time = models.TimeField(null=True, blank=True)

    class Meta:
        unique_together = [("business", "day_of_week")]
        ordering = ["day_of_week"]
        verbose_name = "horario del negocio"
        verbose_name_plural = "horarios del negocio"

    def __str__(self):
        return f"{self.get_day_of_week_display()} - {'Abierto' if self.is_open else 'Cerrado'}"


def ensure_business_hours(business):
    """Create default working hours (Mon-Sat open, Sun closed) if not present."""
    for day_of_week in range(7):
        BusinessHours.objects.get_or_create(
            business=business,
            day_of_week=day_of_week,
            defaults={"is_open": day_of_week < 6},
        )


class UserProfile(models.Model):
    class PhoneCountryCode(models.TextChoices):
        ARGENTINA = "+54", "Argentina (+54)"
        URUGUAY = "+598", "Uruguay (+598)"
        CHILE = "+56", "Chile (+56)"
        BRASIL = "+55", "Brasil (+55)"
        PARAGUAY = "+595", "Paraguay (+595)"
        BOLIVIA = "+591", "Bolivia (+591)"
        PERU = "+51", "Peru (+51)"
        COLOMBIA = "+57", "Colombia (+57)"
        MEXICO = "+52", "Mexico (+52)"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    business = models.ForeignKey(
        BusinessAccount,
        related_name="user_profiles",
        on_delete=models.PROTECT,
    )
    avatar = models.FileField(
        upload_to="user-profiles/",
        blank=True,
        validators=[PROFILE_ASSET_FILE_VALIDATOR],
    )
    phone_country_code = models.CharField(
        max_length=8,
        choices=PhoneCountryCode.choices,
        default=PhoneCountryCode.ARGENTINA,
    )
    phone_number = models.CharField(max_length=32, blank=True)
    push_subscription = models.JSONField(null=True, blank=True, default=None)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "perfil de usuario"
        verbose_name_plural = "perfiles de usuario"

    def __str__(self):
        return self.user.get_username()

    @property
    def phone_display(self):
        number = (self.phone_number or "").strip()
        if not number:
            return ""
        return f"{self.phone_country_code} {number}"

    @classmethod
    def for_user(cls, user, business=None):
        if business is None:
            try:
                profile = user.profile
                if profile.business_id:
                    return profile
            except (AttributeError, cls.DoesNotExist):
                pass
            business = BusinessAccount.get_default()
        profile, created = cls.objects.get_or_create(
            user=user,
            defaults={"business": business},
        )
        if not created and profile.business_id is None:
            profile.business = business
            profile.save(update_fields=["business", "updated_at"])
        return profile


class AuditLog(models.Model):
    business = models.ForeignKey(
        BusinessAccount,
        null=True,
        blank=True,
        related_name="audit_logs",
        on_delete=models.SET_NULL,
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_logs",
    )
    actor_username = models.CharField(max_length=150, blank=True)
    actor_email = models.EmailField(blank=True)
    actor_role = models.CharField(max_length=32, blank=True)
    action = models.CharField(max_length=40)
    module = models.CharField(max_length=80)
    entity_type = models.CharField(max_length=120)
    entity_id = models.CharField(max_length=80, blank=True)
    entity_label = models.CharField(max_length=240, blank=True)
    before = models.JSONField(null=True, blank=True)
    after = models.JSONField(null=True, blank=True)
    changes = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    request_path = models.CharField(max_length=500, blank=True)
    request_method = models.CharField(max_length=12, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = "registro de auditoría"
        verbose_name_plural = "registros de auditoría"
        indexes = [
            models.Index(fields=["-created_at"], name="core_auditl_created_49a799_idx"),
            models.Index(fields=["actor", "-created_at"], name="core_auditl_actor_i_010a7d_idx"),
            models.Index(fields=["module", "-created_at"], name="core_auditl_module_709697_idx"),
            models.Index(fields=["action", "-created_at"], name="core_auditl_action_bcd443_idx"),
            # business-led: AuditLogView filtra business= y luego ordena -created_at.
            models.Index(fields=["business", "-created_at"], name="audit_biz_created_idx"),
            models.Index(fields=["business", "module", "-created_at"], name="audit_biz_module_idx"),
            models.Index(fields=["business", "action", "-created_at"], name="audit_biz_action_idx"),
            models.Index(fields=["business", "entity_type", "entity_id"], name="audit_biz_entity_idx"),
        ]

    def __str__(self):
        return f"{self.created_at:%Y-%m-%d %H:%M:%S} {self.action} {self.entity_type}#{self.entity_id}"


class PasswordResetToken(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="password_reset_tokens",
    )
    token = models.CharField(max_length=128, unique=True, db_index=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "token de restablecimiento"
        verbose_name_plural = "tokens de restablecimiento"

    def is_valid(self):
        return not self.used and self.expires_at > timezone.now()

    def __str__(self):
        return f"PasswordResetToken user={self.user_id} used={self.used}"
