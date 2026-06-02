from django.db import models

from core.models import VehicleType


class Service(models.Model):
    class ServiceType(models.TextChoices):
        WASH = "wash", "Lavado"
        DETAILING = "detailing", "Detailing"
        COMBO = "combo", "Combo"

    business = models.ForeignKey("core.BusinessAccount", related_name="services", on_delete=models.PROTECT)
    name = models.CharField(max_length=140)
    icon = models.CharField(max_length=24, blank=True)
    service_type = models.CharField(max_length=20, choices=ServiceType.choices)
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

    class Meta:
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
        self.save(update_fields=["is_active", "updated_at"])
