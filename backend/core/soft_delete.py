"""Mixin de borrado logico (soft delete) compartido.

Los modelos que extiendan `SoftDeleteMixin` adoptan:

- Campo `deleted_at` (nullable, indexado).
- `objects` con filtro por defecto `deleted_at IS NULL` (via `SoftDeleteManager`).
- `all_objects` para acceder a registros borrados (auditoria, recuperacion).
- `Meta.base_manager_name = "objects"` para que los related managers
  reverse (`customer.reservations`, `work_order.payments`) tambien filtren.
- Override de `delete()` que marca `deleted_at = timezone.now()`.
- `restore()` para revertir el borrado logico (limpia `deleted_at` y, si
  existe el campo `is_active`, lo vuelve a `True`).
- Metodo `hard_delete()` para el borrado fisico real.

La propagacion en cascada NO es automatica: cada modelo padre debe
implementar su propio `delete()` que llame `delete()` en los hijos
relevantes (envuelto en `transaction.atomic`). Esto es deliberado para
mantener cascadas explicitas y visibles en el codigo. La cascada inversa
(`restore`) sigue la misma convencion: cada padre con cascada documenta
y restaura sus hijos.
"""

from django.db import models
from django.utils import timezone


class SoftDeleteQuerySet(models.QuerySet):
    def delete(self):
        count = self.update(deleted_at=timezone.now())
        return count, {self.model._meta.label: count}

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

    def restore(self):
        # No usamos `save(update_fields=...)` porque `base_manager_name="objects"`
        # filtra registros borrados y haria fallar el chequeo de filas. Hacemos
        # el update via `all_objects` y refrescamos la instancia en memoria.
        updates = {"deleted_at": None}
        if hasattr(self, "is_active"):
            updates["is_active"] = True
        if hasattr(self, "updated_at"):
            updates["updated_at"] = timezone.now()
        type(self).all_objects.filter(pk=self.pk).update(**updates)
        for field, value in updates.items():
            setattr(self, field, value)
