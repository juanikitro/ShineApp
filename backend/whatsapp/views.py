from rest_framework import decorators, response, status, viewsets
from rest_framework.views import APIView

from core.permissions import EmployerOnly, business_from_request

from .models import (
    WhatsAppAutomationRule,
    WhatsAppConfig,
    WhatsAppMessage,
    WhatsAppTemplate,
)
from .serializers import (
    ManualWhatsAppMessageSerializer,
    WhatsAppAutomationRuleSerializer,
    WhatsAppConfigSerializer,
    WhatsAppMessageSerializer,
    WhatsAppTemplateSerializer,
)


def ensure_default_rules(business):
    for event, _label in WhatsAppAutomationRule.Event.choices:
        WhatsAppAutomationRule.objects.get_or_create(business=business, event=event)


class WhatsAppConfigView(APIView):
    permission_classes = [EmployerOnly]

    def get_object(self):
        return WhatsAppConfig.get_solo(business_from_request(self.request))

    def get(self, request):
        return response.Response(WhatsAppConfigSerializer(self.get_object()).data)

    def patch(self, request):
        serializer = WhatsAppConfigSerializer(
            self.get_object(),
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return response.Response(serializer.data)


class WhatsAppTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = WhatsAppTemplateSerializer
    permission_classes = [EmployerOnly]

    def get_queryset(self):
        return WhatsAppTemplate.objects.filter(
            business=business_from_request(self.request)
        ).order_by("key", "id")

    def perform_create(self, serializer):
        serializer.save(business=business_from_request(self.request))


class WhatsAppAutomationRuleViewSet(viewsets.ModelViewSet):
    serializer_class = WhatsAppAutomationRuleSerializer
    permission_classes = [EmployerOnly]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        business = business_from_request(self.request)
        ensure_default_rules(business)
        return WhatsAppAutomationRule.objects.select_related("template").filter(business=business)


class WhatsAppMessageViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = WhatsAppMessageSerializer
    permission_classes = [EmployerOnly]

    def get_queryset(self):
        queryset = WhatsAppMessage.objects.select_related(
            "customer",
            "vehicle",
            "reservation",
            "work_order",
            "quote",
            "template",
            "created_by",
        ).filter(business=business_from_request(self.request))
        for field in ["status", "event", "customer", "reservation", "quote"]:
            value = self.request.query_params.get(field)
            if value:
                queryset = queryset.filter(**{field: value})
        return queryset

    @decorators.action(detail=False, methods=["post"], url_path="send-manual")
    def send_manual(self, request):
        serializer = ManualWhatsAppMessageSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        message = serializer.save()
        return response.Response(
            WhatsAppMessageSerializer(message).data,
            status=status.HTTP_201_CREATED,
        )

