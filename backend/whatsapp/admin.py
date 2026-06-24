from django.contrib import admin

from .models import (
    WhatsAppAutomationRule,
    WhatsAppConfig,
    WhatsAppMessage,
    WhatsAppTemplate,
)


@admin.register(WhatsAppConfig)
class WhatsAppConfigAdmin(admin.ModelAdmin):
    list_display = ["business", "provider", "is_enabled", "phone_number_display", "updated_at"]
    list_filter = ["provider", "is_enabled"]
    search_fields = ["business__name", "phone_number_display", "phone_number_id"]


@admin.register(WhatsAppTemplate)
class WhatsAppTemplateAdmin(admin.ModelAdmin):
    list_display = ["business", "key", "provider_template_name", "language", "is_active"]
    list_filter = ["key", "category", "is_active"]
    search_fields = ["business__name", "provider_template_name", "body_preview"]


@admin.register(WhatsAppAutomationRule)
class WhatsAppAutomationRuleAdmin(admin.ModelAdmin):
    list_display = ["business", "event", "template", "enabled"]
    list_filter = ["event", "enabled"]
    search_fields = ["business__name", "template__provider_template_name"]


@admin.register(WhatsAppMessage)
class WhatsAppMessageAdmin(admin.ModelAdmin):
    list_display = ["id", "business", "event", "recipient_phone", "provider", "status", "created_at"]
    list_filter = ["event", "provider", "status", "created_at"]
    search_fields = ["recipient_phone", "recipient_name", "provider_message_id", "last_error"]
    readonly_fields = ["provider_response", "created_at", "updated_at", "sent_at"]

