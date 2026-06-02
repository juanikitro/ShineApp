from django.contrib import admin
from django.utils import timezone

from .models import PublicRequest, PublicRequestItem


class PublicRequestItemInline(admin.TabularInline):
    model = PublicRequestItem
    extra = 0
    readonly_fields = ["description"]
    fields = ["service", "description", "quantity"]
    autocomplete_fields = ["service"]
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(PublicRequest)
class PublicRequestAdmin(admin.ModelAdmin):
    list_display = [
        "id", "request_type", "customer_name", "customer_phone",
        "status", "preferred_day", "created_at",
    ]
    list_filter = ["request_type", "status", "vehicle_type", "created_at"]
    search_fields = [
        "customer_name", "customer_phone", "customer_email",
        "vehicle_license_plate", "vehicle_brand",
    ]
    date_hierarchy = "created_at"
    list_per_page = 25
    ordering = ["-created_at", "-id"]
    readonly_fields = [
        "ip_address", "user_agent", "push_subscription",
        "converted_reservation", "converted_quote", "converted_at",
        "archived_at", "created_at", "updated_at",
    ]
    inlines = [PublicRequestItemInline]
    save_on_top = True
    list_select_related = True
    actions = ["mark_as_archived"]
    fieldsets = (
        (None, {"fields": ("request_type", "status", "message")}),
        ("Cliente", {"fields": ("customer_name", "customer_phone", "customer_email")}),
        ("Vehículo", {"fields": ("vehicle_type", "vehicle_license_plate", "vehicle_brand", "vehicle_model", "vehicle_color")}),
        ("Preferencias", {"fields": ("preferred_day", "preferred_time")}),
        ("Conversión", {"fields": ("converted_reservation", "converted_quote", "converted_at")}),
        ("Técnico", {"classes": ("collapse",), "fields": ("ip_address", "user_agent", "push_subscription", "archived_at", "created_at", "updated_at")}),
    )

    @admin.action(description="Archivar solicitudes seleccionadas")
    def mark_as_archived(self, request, queryset):
        now = timezone.now()
        updated = queryset.exclude(status=PublicRequest.Status.ARCHIVED).update(
            status=PublicRequest.Status.ARCHIVED,
            archived_at=now,
            updated_at=now,
        )
        self.message_user(request, f"{updated} solicitud(es) archivada(s).")
