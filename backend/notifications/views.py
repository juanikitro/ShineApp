from datetime import timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import decorators, mixins, permissions, response, status, viewsets
from rest_framework.views import APIView

from catalog.models import Service
from core.audit import audit_snapshot, record_audit_event
from core.models import BusinessAccount, BusinessProfile
from core.permissions import EmployerOnly, business_from_request, file_url

from .models import PublicRequest
from .serializers import (
    PublicLandingRequestSerializer,
    PublicLandingServiceSerializer,
    PublicRequestConvertSerializer,
    PublicRequestSerializer,
)


PUBLIC_REQUESTS_PER_IP_PER_HOUR = 5


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
        services = Service.objects.filter(
            business=business,
            is_active=True,
        ).order_by("service_type", "name")
        return response.Response(
            {
                "business": {
                    "name": profile.name,
                    "slug": business.slug,
                    "logo_url": file_url(profile.logo, request=request),
                    "contact_phone": profile.contact_phone,
                    "contact_email": profile.contact_email,
                    "address": profile.address,
                    "intro": profile.public_landing_intro,
                },
                "actions": {
                    "booking_requests": profile.allow_public_booking_requests,
                    "quote_requests": profile.allow_public_quote_requests,
                },
                "services": PublicLandingServiceSerializer(services, many=True).data,
            }
        )


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
        return response.Response(
            PublicRequestSerializer(public_request, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


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
