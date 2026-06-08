from datetime import date, timedelta

from django.core.cache import cache
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import decorators, mixins, permissions, response, status, viewsets
from rest_framework.views import APIView

from catalog.models import Service
from core.audit import audit_snapshot, record_audit_event
from core.models import BusinessAccount, BusinessProfile
from core.permissions import EmployerOnly, business_from_request, file_url
from scheduling.models import (
    DETAILING_BUCKET,
    WASH_BUCKET,
    DailyCapacity,
    Reservation,
)

from .models import PublicRequest
from .service import send_business_push_notification, send_new_public_request_notification
from .serializers import (
    build_public_request_suggestions_map,
    PublicLandingRequestSerializer,
    PublicLandingServiceSerializer,
    PublicRequestConvertSerializer,
    PublicRequestSerializer,
)


PUBLIC_REQUESTS_PER_IP_PER_HOUR = 5
PUBLIC_RECALL_PER_IP = 3
PUBLIC_RECALL_WINDOW_SECONDS = 15 * 60


def recall_cache_key(ip):
    return f"public_recall_ip_{ip}"


def client_ip(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


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
        enabled_types = []
        if profile.public_show_wash_services:
            enabled_types.append("wash")
        if profile.public_show_detailing_services:
            enabled_types.append("detailing")
        if profile.public_show_wash_services and profile.public_show_detailing_services:
            enabled_types.append("combo")
        hidden_ids = [
            int(value)
            for value in (profile.public_hidden_service_ids or [])
            if isinstance(value, (int, str)) and str(value).lstrip("-").isdigit()
        ]
        services = Service.objects.filter(
            business=business,
            is_active=True,
            service_type__in=enabled_types,
        ).exclude(id__in=hidden_ids).order_by("service_type", "name")
        landing = response.Response(
            {
                "business": {
                    "name": profile.name,
                    "slug": business.slug,
                    "logo_url": file_url(profile.logo, request=request),
                    "contact_phone": profile.contact_phone,
                    "contact_email": profile.contact_email,
                    "address": profile.address,
                    "intro": profile.public_landing_intro,
                    "opening_time": profile.opening_time.strftime("%H:%M") if profile.opening_time else None,
                    "closing_time": profile.closing_time.strftime("%H:%M") if profile.closing_time else None,
                },
                "actions": {
                    "booking_requests": profile.allow_public_booking_requests,
                    "quote_requests": profile.allow_public_quote_requests,
                },
                "services": PublicLandingServiceSerializer(services, many=True).data,
            }
        )
        # Datos publicos y de baja frecuencia de cambio: cacheables en el edge de
        # Vercel. "public" habilita cache compartido (no hay datos por-usuario);
        # s-maxage controla el CDN y stale-while-revalidate sirve sin ir al origen
        # mientras revalida en segundo plano.
        landing["Cache-Control"] = "public, s-maxage=120, stale-while-revalidate=600"
        return landing


def _availability_payload(business, profile, day):
    capacity_row = DailyCapacity.objects.filter(business=business, day=day).first()
    if capacity_row:
        max_slots_wash = capacity_row.max_slots_wash
        max_slots_detailing = capacity_row.max_slots_detailing
    else:
        max_slots_wash = Reservation.capacity_for_day(day, business=business, bucket=WASH_BUCKET)
        max_slots_detailing = Reservation.capacity_for_day(day, business=business, bucket=DETAILING_BUCKET)
    used_slots_wash = Reservation.used_slots_for_day(day, business=business, bucket=WASH_BUCKET)
    used_slots_detailing = Reservation.used_slots_for_day(day, business=business, bucket=DETAILING_BUCKET)
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
        "allow_overlapping": bool(profile.allow_overlapping_reservations),
        "wash": {
            "max_slots": max_slots_wash,
            "used_slots": used_slots_wash,
            "available_slots": max(max_slots_wash - used_slots_wash, 0),
        },
        "detailing": {
            "max_slots": max_slots_detailing,
            "used_slots": used_slots_detailing,
            "available_slots": max(max_slots_detailing - used_slots_detailing, 0),
        },
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
        business, _ = public_business_or_404(slug)
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

        customer = self._find_customer(business, phone, email)
        vehicles = []
        if customer:
            from customers.models import Vehicle

            vehicles = list(
                Vehicle.objects.filter(
                    business=business,
                    customer=customer,
                    is_active=True,
                ).order_by("license_plate")[:5]
            )

        return response.Response({
            "customer_name": customer.name if customer else None,
            "customer_phone": customer.phone if customer else None,
            "customer_email": customer.email if customer else None,
            "vehicles": [
                {
                    "license_plate": v.license_plate,
                    "brand": v.brand,
                    "model": v.model,
                    "vehicle_type": v.vehicle_type,
                }
                for v in vehicles
            ],
        })

    @staticmethod
    def _find_customer(business, phone, email):
        from customers.models import Customer

        qs = Customer.objects.filter(business=business, is_active=True)

        if email:
            customer = qs.filter(email__iexact=email).first()
            if customer:
                return customer

        phone_digits = "".join(c for c in phone if c.isdigit())
        if phone_digits:
            for customer in qs.exclude(phone="").only("id", "name", "phone", "email"):
                if "".join(c for c in customer.phone if c.isdigit()) == phone_digits:
                    return customer

        return None


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
