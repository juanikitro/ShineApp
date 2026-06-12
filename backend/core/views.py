from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .audit import audit_entity_payload, audit_snapshot, record_audit_event
from .models import AuditLog
from .permissions import EmployerOnly, business_from_request, scope_queryset_to_business
from .serializers import AuditLogSerializer
from .trash import get_trash_entry, get_trash_registry


class AuditLogView(generics.ListAPIView):
    serializer_class = AuditLogSerializer
    permission_classes = [EmployerOnly]

    def get_queryset(self):
        queryset = AuditLog.objects.select_related("actor", "business").filter(
            business=business_from_request(self.request),
        )
        actor = self.request.query_params.get("actor")
        module = self.request.query_params.get("module")
        action = self.request.query_params.get("action")
        date_from = parse_date(self.request.query_params.get("from") or "")
        date_to = parse_date(self.request.query_params.get("to") or "")
        query = self.request.query_params.get("q") or self.request.query_params.get("search")

        if actor:
            queryset = queryset.filter(
                Q(actor_id=actor) if str(actor).isdigit() else Q(actor_username__icontains=actor)
            )
        if module:
            queryset = queryset.filter(module=module)
        if action:
            queryset = queryset.filter(action=action)
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        entity_type = self.request.query_params.get("entity_type")
        entity_id = self.request.query_params.get("entity_id")
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type)
        if entity_id:
            queryset = queryset.filter(entity_id=str(entity_id))
        if query:
            queryset = queryset.filter(
                Q(actor_username__icontains=query)
                | Q(actor_email__icontains=query)
                | Q(action__icontains=query)
                | Q(module__icontains=query)
                | Q(entity_type__icontains=query)
                | Q(entity_id__icontains=query)
                | Q(entity_label__icontains=query)
                | Q(request_path__icontains=query)
            )
        return queryset


def _scoped_deleted_queryset(entry, business):
    manager = entry.model.all_objects
    queryset = manager.filter(deleted_at__isnull=False)
    if entry.select_related:
        queryset = queryset.select_related(*entry.select_related)
    if entry.prefetch_related:
        queryset = queryset.prefetch_related(*entry.prefetch_related)
    return scope_queryset_to_business(queryset, business).order_by("-deleted_at", "-pk")


def _serialize_deleted_row(entry, instance):
    return {
        "id": instance.pk,
        "type": entry.key,
        "type_label": entry.label_singular,
        "module": entry.module,
        "label": entry.render_label(instance),
        "secondary": entry.render_secondary(instance),
        "deleted_at": instance.deleted_at.isoformat() if instance.deleted_at else None,
    }


class TrashView(APIView):
    permission_classes = [EmployerOnly]

    def get(self, request):
        business = business_from_request(request)
        type_filter = (request.query_params.get("type") or "").strip().lower()
        search = (request.query_params.get("q") or request.query_params.get("search") or "").strip()
        groups = []
        total = 0
        for entry in get_trash_registry():
            if type_filter and entry.key != type_filter:
                continue
            queryset = _scoped_deleted_queryset(entry, business)
            count = queryset.count()
            preview_rows = []
            if count:
                preview = list(queryset[:50])
                rows = [_serialize_deleted_row(entry, instance) for instance in preview]
                if search:
                    needle = search.lower()
                    rows = [
                        row
                        for row in rows
                        if needle in row["label"].lower()
                        or needle in (row.get("secondary") or "").lower()
                    ]
                preview_rows = rows
            groups.append(
                {
                    "type": entry.key,
                    "label_singular": entry.label_singular,
                    "label_plural": entry.label_plural,
                    "module": entry.module,
                    "count": count,
                    "items": preview_rows,
                }
            )
            total += count
        return Response({"total": total, "groups": groups})


class TrashItemBaseView(APIView):
    permission_classes = [EmployerOnly]

    def _resolve(self, request, entry_key, pk):
        entry = get_trash_entry(entry_key)
        if entry is None:
            return None, None, Response(
                {"detail": "Tipo de registro no soportado."},
                status=status.HTTP_404_NOT_FOUND,
            )
        business = business_from_request(request)
        queryset = entry.model.all_objects.filter(deleted_at__isnull=False)
        queryset = scope_queryset_to_business(queryset, business)
        instance = queryset.filter(pk=pk).first()
        if instance is None:
            return entry, None, Response(
                {"detail": "Registro no encontrado en la papelera."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return entry, instance, None


class TrashRestoreView(TrashItemBaseView):
    def post(self, request, entry_key, pk):
        entry, instance, error_response = self._resolve(request, entry_key, pk)
        if error_response is not None:
            return error_response
        before = audit_snapshot(instance)
        entity = audit_entity_payload(instance)
        instance.restore()
        instance.refresh_from_db()
        after = audit_snapshot(instance)
        record_audit_event(
            request=request,
            action="restore",
            instance=instance,
            before=before,
            after=after,
            module=entry.module,
            entity_type=entity["entity_type"],
            entity_id=entity["entity_id"],
            entity_label=entry.render_label(instance),
        )
        return Response(_serialize_deleted_row(entry, instance), status=status.HTTP_200_OK)


class TrashPurgeView(TrashItemBaseView):
    def delete(self, request, entry_key, pk):
        entry, instance, error_response = self._resolve(request, entry_key, pk)
        if error_response is not None:
            return error_response
        before = audit_snapshot(instance)
        entity = audit_entity_payload(instance)
        label = entry.render_label(instance)
        try:
            instance.hard_delete()
        except Exception as exc:
            return Response(
                {
                    "detail": "No se puede eliminar definitivamente: existen registros relacionados.",
                    "error": str(exc),
                },
                status=status.HTTP_409_CONFLICT,
            )
        record_audit_event(
            request=request,
            action="purge",
            instance=None,
            before=before,
            after=None,
            module=entry.module,
            entity_type=entity["entity_type"],
            entity_id=entity["entity_id"],
            entity_label=label,
            metadata={"deleted_at": before.get("deleted_at") if before else None},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
