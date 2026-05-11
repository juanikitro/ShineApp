from django.db import models


class Service(models.Model):
    class ServiceType(models.TextChoices):
        WASH = "wash", "Lavado"
        DETAILING = "detailing", "Detailing"
        COMBO = "combo", "Combo"

    name = models.CharField(max_length=140)
    icon = models.CharField(max_length=24, blank=True)
    service_type = models.CharField(max_length=20, choices=ServiceType.choices)
    base_price = models.DecimalField(max_digits=12, decimal_places=2)
    estimated_duration_minutes = models.PositiveIntegerField(default=60)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["service_type", "name"]

    def __str__(self):
        return self.name

    def delete(self, using=None, keep_parents=False):
        self.is_active = False
        self.save(update_fields=["is_active", "updated_at"])
