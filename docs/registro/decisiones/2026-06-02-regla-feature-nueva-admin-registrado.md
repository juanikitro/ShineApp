# Regla: toda feature nueva debe tener su ModelAdmin registrado

## Decisión

Todo modelo Django nuevo que se agregue al proyecto —ahora o en el futuro— debe tener su `ModelAdmin` registrado en el `admin.py` de su app antes de cerrar la tarea. Un modelo sin registro en el admin se considera **incompleto**.

## Alcance

Esta regla aplica a:

- Modelos nuevos creados en cualquier tarea o PR.
- Modelos existentes que aún no tengan `ModelAdmin` (ya cubiertos en el cambio `2026-06-02-django-admin-completo.md`).
- Modelos que se renombren o migren; si el admin anterior ya no aplica, crear uno nuevo antes de mergear.

## Mínimo exigible por `ModelAdmin`

```python
@admin.register(MiModelo)
class MiModeloAdmin(admin.ModelAdmin):
    list_display = [...]     # al menos: __str__ + campos clave
    search_fields = [...]    # para habilitar autocomplete_fields desde otros admins
    list_filter = [...]      # filtros relevantes
    list_per_page = 25
    ordering = [...]         # sensato: -fecha o -id
```

Si el modelo tiene relaciones FK frecuentes, agregar `autocomplete_fields` y `list_select_related`.

## Motivo

El admin es la herramienta de operaciones de fallback. Si un modelo no está registrado, el equipo pierde visibilidad sobre datos en producción y no puede operar sin acceso directo a la DB. Además, los `autocomplete_fields` de otros admins dependen de que el modelo target tenga `search_fields` registrados.

## Cómo validar

Antes de cerrar cualquier tarea con modelos nuevos:

```powershell
# desde backend/
py -3 manage.py check
# verificar visualmente que el modelo aparece en admin/
```

Si un modelo se agrega sin `ModelAdmin`, el revisor del PR debe rechazarlo hasta que se complete.

## Deuda técnica: permisos por rol

Actualmente solo `is_superuser` accede al admin (los usuarios con `business` tienen `is_staff=False` por diseño en `BusinessUserAdmin`). La distinción de permisos por rol (empleador vs. empleado) está documentada en los `ModelAdmin` de finance como comentario, pero no activa.

Si en el futuro se habilita acceso admin para staff no-superuser, cada admin debe revisar sus métodos `has_add/change/delete/view_permission` para segmentar:
- Staff operativo: `scheduling`, `workorders`, `customers`
- Solo empleador/superuser: `finance`, `debts`
- Solo superuser: `core`, `AuditLog`
