# Performance Capa 2: Filtro de fecha por defecto en el historial de auditoría

## Contexto

Auditoría de performance (2026-06-12/13). El historial de auditoría iniciaba
con `auditFilters = {}` (sin filtros) y `apiList` seguía todos los cursores de
paginación hasta descargar el registro completo — potencialmente miles de
entradas para negocios con historial largo. Toda esa data se renderizaba como
DOM nodes en `SettingsWorkspace`.

## Cambio

`page.tsx` — `auditFilters` pasa a inicializarse con `from` = hace 90 días:

```typescript
const [auditFilters, setAuditFilters] = useState<AuditLogFilters>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 90)
    return { from: d.toISOString().slice(0, 10) }
})
```

El backend ya soporta `?from=YYYY-MM-DD` en `/audit-log/` (filtro
`created_at__date__gte`). El filtro se muestra en el formulario de filtros de
la sección historial — el usuario puede borrarlo para cargar todo el historial.
`clearAuditFilters()` sigue reseteando a `{}` para permitir acceso al historial
completo explícitamente.

## Impacto esperado

- La carga inicial del historial descarga sólo las entradas de los últimos 90
  días en vez de todo el histórico. Para negocios con un año de operación, la
  reducción puede ser de 10x en datos transferidos y DOM nodes renderiados.
- El backend usa el índice compuesto `(business, -created_at)` para esta query.

## Archivos modificados

- `frontend/app/page.tsx` (4 líneas)

## Validación

- `npx tsc --noEmit`: sin errores.
