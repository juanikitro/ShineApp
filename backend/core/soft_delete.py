"""Mixin de borrado logico (soft delete) compartido.

Los modelos que extiendan `SoftDeleteMixin` adoptan:

- Campo `deleted_at` (nullable, indexado).
- `objects` con filtro por defecto `deleted_at IS NULL` (via `SoftDeleteManager`).
- `all_objects` para acceder a registros borrados (auditoria, recuperacion).
- `Meta.base_manager_name = "objects"` para que los related managers
  reverse (`customer.reservations`, `work_order.payments`) tambien filtren.
- Override de `delete()` que marca `deleted_at = timezone.now()`.
- Metodo `hard_delete()` para el borrado fisico real.

La propagacion en cascada NO es automatica: cada modelo padre debe
implementar su propio `delete()` que llame `delete()` en los hijos
relevantes (envuelto en `transaction.atomic`). Esto es deliberado para
mantener cascadas explicitas y visibles en el codigo.
"""

from django.db import models
from django.utils import timezone


class SoftDeleteQuerySet(models.QuerySet):
    def delete(self):
        return self.update(deleted_at=timezone.now())

    def hard_delete(self):
        return super().delete()

    def alive(self):
        return self.filter(deleted_at__isnull=True)

    def dead(self):
        return self.filter(deleted_at__isnull=False)


class SoftDeleteManager(models.Manager.from_queryset(SoftDeleteQuerySet)):
    def get_queryset(self):
        return super().get_queryset().alive()


class SoftDeleteMixin(models.Model):
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    objects = SoftDeleteManager()
    all_objects = models.Manager.from_queryset(SoftDeleteQuerySet)()

    class Meta:
        abstract = True
        base_manager_name = "objects"

    def delete(self, using=None, keep_parents=False):
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at"])

    def hard_delete(self, using=None, keep_parents=False):
        return super().delete(using=using, keep_parents=keep_parents)
