from django.conf import settings
from django.core.validators import FileExtensionValidator
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


PROFILE_ASSET_FILE_VALIDATOR = FileExtensionValidator(
    allowed_extensions=["png", "jpg", "jpeg", "webp", "svg", "pdf"],
)


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
):
    category = str(category or "").strip()
    subcategory = str(subcategory or "").strip()
    if not category or not subcategory:
        return
    profile = BusinessProfile.get_solo()
    current_tree = getattr(profile, field_name)
    next_tree = tree_builder(
        current_tree,
        category,
        subcategory,
    )
    if next_tree != current_tree:
        setattr(profile, field_name, next_tree)
        profile.save(update_fields=[field_name, "updated_at"])


def register_expense_classification(category, subcategory):
    register_profile_classification(
        category,
        subcategory,
        field_name="expense_category_tree",
        tree_builder=tree_with_expense_classification,
    )


def register_income_classification(category, subcategory):
    register_profile_classification(
        category,
        subcategory,
        field_name="income_category_tree",
        tree_builder=tree_with_income_classification,
    )


class BusinessProfile(models.Model):
    class SubscriptionType(models.TextChoices):
        TRIAL = "trial", "Prueba"
        PREMIUM = "premium", "Premium"

    class VatCondition(models.TextChoices):
        RESPONSABLE_INSCRIPTO = "responsable_inscripto", "Responsable inscripto"
        MONOTRIBUTO = "monotributo", "Monotributo"
        EXENTO = "exento", "Exento"
        CONSUMIDOR_FINAL = "consumidor_final", "Consumidor final"

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
    contact_phone = models.CharField(max_length=60, blank=True)
    contact_email = models.EmailField(blank=True)
    address = models.CharField(max_length=220, blank=True)
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
    use_reservation_times = models.BooleanField(default=True)
    show_stay_days_in_agenda = models.BooleanField(default=True)
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
    def get_solo(cls):
        profile = cls.objects.order_by("id").first()
        if profile:
            return profile
        return cls.objects.create(
            name=getattr(settings, "BUSINESS_NAME", "ShineApp"),
        )

    @classmethod
    def current_business_name(cls):
        profile = cls.objects.only("name").order_by("id").first()
        if profile and profile.name:
            return profile.name
        return getattr(settings, "BUSINESS_NAME", "ShineApp")


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
    def for_user(cls, user):
        profile, _ = cls.objects.get_or_create(user=user)
        return profile
