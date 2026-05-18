from django.db.models import Q
from django.utils.dateparse import parse_date
from rest_framework import generics

from .models import AuditLog
from .permissions import EmployerOnly, business_from_request
from .serializers import AuditLogSerializer


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
