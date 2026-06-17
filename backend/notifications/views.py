from datetime import date, timedelta

from django.core.cache import cache
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import decorators, mixins, permissions, response, status, viewsets
from rest_framework.views import APIView

from catalog.models import Sector, Service
from core.audit import audit_snapshot, record_audit_event
from core.models import BusinessAccount, BusinessHours, BusinessProfile
from core.permissions import EmployerOnly, business_from_request, file_url
from core.request_ip import get_client_ip
from scheduling.models import Reservation

from .models import PublicRequest
from .serializers import (
    PublicLandingRequestSerializer,
    PublicLandingServiceSerializer,
    PublicRequestConvertSerializer,
    PublicRequestSerializer,
    build_public_request_suggestions_map,
)
from .service import send_business_push_notification, send_new_public_request_notification

PUBLIC_REQUESTS_PER_IP_PER_HOUR = 5
PUBLIC_RECALL_PER_IP = 3
PUBLIC_RECALL_WINDOW_SECONDS = 15 * 60


def recall_cache_key(ip):
    return f"public_recall_ip_{ip}"


def client_ip(request):
    # Delega en el helper central que cuenta saltos de proxy desde la derecha,
    # resistente a X-Forwarded-For falsificado (ver core/request_ip.py). Tomar el
    # primer valor del header permitia evadir el rate-limit y falsear la IP.
    return get_client_ip(request)


def public_business_or_404(slug):
    business = get_object_or_404(BusinessAccount, slug=slug, is_active=True)
    profile = BusinessProfile.get_solo(business=business)
    if not profile.public_landing_enabled:
        from django.http import Http404

        raise Http404
    return business, profile


class PublicLandingView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        business, profile = public_business_or_404(slug)
        hidden_ids = [
            int(value)
            for value in (profile.public_hidden_service_ids or [])
            if isinstance(value, (int, str)) and str(value).lstrip("-").isdigit()
        ]
        visible_sectors = list(
            Sector.objects.filter(
                business=business,
                is_active=True,
                public_visible=True,
                deleted_at__isnull=True,
            ).order_by("order", "name")
        )
        services = (
            Service.objects.filter(
                business=business,
                is_active=True,
                sector__in=visible_sectors,
            )
            .exclude(id__in=hidden_ids)
            .order_by("sector__order", "name")
        )
        show_description = profile.public_show_service_description
        show_price = profile.public_show_service_price
        landing = response.Response(
            {
                "business": {
                    "name": profile.name,
                    "slug": business.slug,
                    "logo_url": file_url(profile.logo, request=request),
                    "contact_phone": profile.contact_phone,
                    "contact_email": profile.contact_email,
                    "address": profile.address,
                    "maps_url": profile.maps_url,
                    "intro": profile.public_landing_intro,
                    "opening_time": profile.opening_time.strftime("%H:%M") if profile.opening_time else None,
                    "closing_time": profile.closing_time.strftime("%H:%M") if profile.closing_time else None,
                },
                "actions": {
                    "booking_requests": profile.allow_public_booking_requests,
                    "quote_requests": profile.allow_public_quote_requests,
                },
                "display": {
                    "show_service_description": show_description,
                    "show_service_price": show_price,
                },
                "sectors": [
                    {
                        "id": sector.id,
                        "name": sector.name,
                        "key": sector.key,
                        "color": sector.color,
                        "order": sector.order,
                    }
                    for sector in visible_sectors
                ],
                "services": PublicLandingServiceSerializer(
                    services,
                    many=True,
                    context={
                        "show_description": show_description,
                        "show_price": show_price,
                    },
                ).data,
            }
        )
        # Datos publicos y de baja frecuencia de cambio: cacheables en el edge de
        # Vercel. "public" habilita cache compartido (no hay datos por-usuario);
        # s-maxage controla el CDN y stale-while-revalidate sirve sin ir al origen
        # mientras revalida en segundo plano.
        landing["Cache-Control"] = "public, s-maxage=120, stale-while-revalidate=600"
        return landing


def _availability_payload(business, profile, day):
    day_of_week = day.weekday()  # 0=Monday, 6=Sunday
    day_hours = BusinessHours.objects.filter(business=business, day_of_week=day_of_week).first()
    if day_hours is not None:
        is_working_day = day_hours.is_open
        day_opening_time = day_hours.opening_time.strftime("%H:%M") if day_hours.opening_time else None
        day_closing_time = day_hours.closing_time.strftime("%H:%M") if day_hours.closing_time else None
    else:
        is_working_day = True
        day_opening_time = None
        day_closing_time = None

    active_sectors = list(
        Sector.objects.filter(
            business=business,
            is_active=True,
            deleted_at__isnull=True,
        ).order_by("order", "name")
    )
    sectors_payload = []
    for sector in active_sectors:
        max_slots = Reservation.capacity_for_day(day, business=business, sector=sector)
        used_slots = Reservation.used_slots_for_day(day, business=business, sector=sector)
        sectors_payload.append(
            {
                "id": sector.id,
                "name": sector.name,
                "key": sector.key,
                "color": sector.color,
                "max_slots": max_slots,
                "used_slots": used_slots,
                "available_slots": max(max_slots - used_slots, 0),
            }
        )
    reservations = (
        Reservation.objects.filter(business=business, day=day)
        .filter(status__in=Reservation.active_statuses())
        .exclude(start_time__isnull=True)
        .select_related("service")
        .order_by("start_time")
    )
    occupied = []
    for reservation in reservations:
        if not reservation.start_time:
            continue
        occupied.append(
            {
                "start_time": reservation.start_time.strftime("%H:%M"),
                "duration_minutes": reservation.estimated_duration_minutes,
            }
        )
    return {
        "date": day.isoformat(),
        "is_working_day": is_working_day,
        "day_opening_time": day_opening_time,
        "day_closing_time": day_closing_time,
        "allow_overlapping": bool(profile.allow_overlapping_reservations),
        "capacity_enforced": bool(profile.enforce_capacity_limit),
        "sectors": sectors_payload,
        "occupied": occupied,
    }


def _overlap_detected(business, day, start_time, duration_minutes, exclude_id=None):
    if not start_time or not duration_minutes:
        return False
    start_minutes = start_time.hour * 60 + start_time.minute
    end_minutes = start_minutes + max(int(duration_minutes), 0)
    reservations = (
        Reservation.objects.filter(business=business, day=day)
        .filter(status__in=Reservation.active_statuses())
        .exclude(start_time__isnull=True)
    )
    if exclude_id:
        reservations = reservations.exclude(pk=exclude_id)
    for reservation in reservations:
        if not reservation.start_time:
            continue
        existing_start = reservation.start_time.hour * 60 + reservation.start_time.minute
        existing_end = existing_start + max(int(reservation.estimated_duration_minutes or 0), 0)
        if start_minutes < existing_end and existing_start < end_minutes:
            return True
    return False


class PublicLandingAvailabilityView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        business, profile = public_business_or_404(slug)
        day_value = request.query_params.get("date") or request.query_params.get("day")
        if not day_value:
            return response.Response(
                {"detail": "Falta el parametro 'date'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            day = date.fromisoformat(day_value)
        except ValueError:
            return response.Response(
                {"detail": "Formato de fecha invalido (usar YYYY-MM-DD)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return response.Response(_availability_payload(business, profile, day))


class PublicLandingRequestCreateView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request, slug):
        business, profile = public_business_or_404(slug)
        ip_address = client_ip(request)
        since = timezone.now() - timedelta(hours=1)
        recent_count = PublicRequest.objects.filter(
            ip_address=ip_address or None,
            created_at__gte=since,
        ).count()
        if ip_address and recent_count >= PUBLIC_REQUESTS_PER_IP_PER_HOUR:
            return response.Response(
                {"detail": "Se alcanzaron demasiadas solicitudes. Proba mas tarde."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        serializer = PublicLandingRequestSerializer(
            data=request.data,
            context={
                "business": business,
                "profile": profile,
                "ip_address": ip_address,
                "user_agent": request.META.get("HTTP_USER_AGENT", ""),
            },
        )
        serializer.is_valid(raise_exception=True)
        public_request = serializer.save()
        send_new_public_request_notification(public_request)
        send_business_push_notification(public_request)
        return response.Response(
            PublicRequestSerializer(public_request, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class PublicLandingRecallView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request, slug):
        # Valida que el negocio exista y tenga el landing publico activo (404 si no).
        public_business_or_404(slug)
        ip_address = client_ip(request)
        if ip_address:
            key = recall_cache_key(ip_address)
            attempts = cache.get(key, 0)
            if attempts >= PUBLIC_RECALL_PER_IP:
                return response.Response(
                    {"detail": "Demasiados intentos. Proba en unos minutos."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            cache.set(key, attempts + 1, timeout=PUBLIC_RECALL_WINDOW_SECONDS)

        phone = (request.data.get("phone") or "").strip()
        email = (request.data.get("email") or "").strip().lower()
        if not phone and not email:
            return response.Response(
                {"detail": "Ingresa tu telefono o email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Seguridad: endpoint publico sin autenticacion. NO devuelve datos de
        # clientes (nombre/email/telefono/patentes) ni confirma si un contacto
        # existe, para no exponer PII ni permitir enumeracion. El visitante
        # completa sus datos manualmente. Se mantiene la forma de respuesta para
        # compatibilidad con el frontend del landing.
        return response.Response({
            "customer_name": None,
            "customer_phone": None,
            "customer_email": None,
            "vehicles": [],
        })


class PublicRequestViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [EmployerOnly]
    serializer_class = PublicRequestSerializer
    queryset = PublicRequest.objects.select_related(
        "business",
        "converted_reservation",
        "converted_quote",
    ).prefetch_related("items", "items__service")

    def get_queryset(self):
        queryset = self.queryset.filter(business=business_from_request(self.request))
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        suggestions_map = getattr(self, "_public_request_suggestions_map", None)
        if suggestions_map is not None:
            context["public_request_suggestions_map"] = suggestions_map
        return context

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        rows = page if page is not None else queryset
        self._public_request_suggestions_map = build_public_request_suggestions_map(rows)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return response.Response(serializer.data)

    @decorators.action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        public_request = self.get_object()
        before = audit_snapshot(public_request)
        if public_request.status != PublicRequest.Status.PENDING:
            return response.Response(
                {"detail": "La solicitud ya fue gestionada."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        public_request.mark_archived()
        record_audit_event(
            request=request,
            action="archive",
            instance=public_request,
            before=before,
            after=audit_snapshot(public_request),
            module="notifications",
        )
        return response.Response(self.get_serializer(public_request).data)

    @decorators.action(detail=True, methods=["post"])
    def convert(self, request, pk=None):
        public_request = self.get_object()
        before = audit_snapshot(public_request)
        serializer = PublicRequestConvertSerializer(
            data=request.data,
            context={"public_request": public_request, "request": request},
        )
        serializer.is_valid(raise_exception=True)
        payload = serializer.save()
        public_request.refresh_from_db()
        record_audit_event(
            request=request,
            action="convert",
            instance=public_request,
            before=before,
            after=audit_snapshot(public_request),
            module="notifications",
            metadata={"created_type": payload["created_type"]},
        )
        return response.Response(payload, status=status.HTTP_201_CREATED)
