from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone
from django.utils.text import slugify

from core.models import VehicleType
from core.soft_delete import SoftDeleteMixin


class Sector(SoftDeleteMixin):
    """Area operativa configurable del negocio (lavadero, detailing, lubricentro, taller, ...).

    Reemplaza al enum fijo `Service.ServiceType` y consolida la capacidad y la
    visibilidad publica que antes vivian por-tipo en `BusinessProfile`
    (`default_capacity_wash/detailing`, `public_show_wash/detailing_services`).
    Cada negocio gestiona sus propios sectores.
    """

    business = models.ForeignKey("core.BusinessAccount", related_name="sectors", on_delete=models.PROTECT)
    key = models.SlugField(max_length=40)
    name = models.CharField(max_length=80)
    color = models.CharField(max_length=16, blank=True)
    icon = models.CharField(max_length=24, blank=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    default_capacity = models.PositiveIntegerField(default=settings.DEFAULT_DAILY_CAPACITY)
    public_visible = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta(SoftDeleteMixin.Meta):
        ordering = ["order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["business", "key"],
                condition=Q(deleted_at__isnull=True),
                name="uniq_sector_key_per_business",
            ),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.business_id:
            from core.models import BusinessAccount

            self.business = BusinessAccount.get_default()
        if not self.key:
            self.key = self._unique_key_from_name()
        super().save(*args, **kwargs)

    def _unique_key_from_name(self):
        max_length = self._meta.get_field("key").max_length
        base = (slugify(self.name) or "sector")[:max_length].strip("-") or "sector"
        candidate = base
        counter = 2
        siblings = Sector.objects.filter(business_id=self.business_id)
        while siblings.filter(key=candidate).exists():
            suffix = f"-{counter}"
            candidate = f"{base[: max_length - len(suffix)].strip('-')}{suffix}"
            counter += 1
        return candidate

    def delete(self, using=None, keep_parents=False):
        self.is_active = False
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_active", "deleted_at", "updated_at"])


class Service(SoftDeleteMixin):
    class ServiceType(models.TextChoices):
        WASH = "wash", "Lavado"
        DETAILING = "detailing", "Detailing"
        COMBO = "combo", "Combo"

    business = models.ForeignKey("core.BusinessAccount", related_name="services", on_delete=models.PROTECT)
    name = models.CharField(max_length=140)
    icon = models.CharField(max_length=24, blank=True)
    service_type = models.CharField(max_length=20, choices=ServiceType.choices)
    sector = models.ForeignKey(
        "catalog.Sector",
        related_name="services",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
    )
    base_price = models.DecimalField(max_digits=12, decimal_places=2)
    price_moto = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    price_auto = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    price_camioneta = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    price_combi = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    price_camion = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    estimated_duration_minutes = models.PositiveIntegerField(default=60)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta(SoftDeleteMixin.Meta):
        ordering = ["service_type", "name"]

    def __str__(self):
        return self.name

    def price_for(self, vehicle_type=None):
        prices = {
            VehicleType.MOTO: self.price_moto,
            VehicleType.AUTO: self.price_auto,
            VehicleType.CAMIONETA: self.price_camioneta,
            VehicleType.COMBI: self.price_combi,
            VehicleType.CAMION: self.price_camion,
        }
        value = prices.get(vehicle_type)
        return value if value is not None else self.base_price

    def save(self, *args, **kwargs):
        if not self.business_id:
            from core.models import BusinessAccount

            self.business = BusinessAccount.get_default()
        super().save(*args, **kwargs)

    def delete(self, using=None, keep_parents=False):
        self.is_active = False
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_active", "deleted_at", "updated_at"])
