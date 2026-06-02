import csv

from django.contrib import admin
from django.http import HttpResponse
from django.utils.html import format_html

from inventory.models import MaterialConsumption
from .models import WorkOrder


class MaterialConsumptionInline(admin.TabularInline):
    model = MaterialConsumption
    extra = 0
    can_delete = False
    readonly_fields = ["material", "consumed_at", "quantity", "estimated_unit_cost", "estimated_total_cost"]
    fields = ["material", "consumed_at", "quantity", "estimated_unit_cost", "estimated_total_cost"]

    def has_add_permission(self, request, obj=None):
        return False


STATUS_COLORS = {
    "pending": "#6c757d",
    "confirmed": "#0d6efd",
    "in_progress": "#fd7e14",
    "ready": "#198754",
    "delivered": "#0dcaf0",
    "canceled": "#dc3545",
}


@admin.register(WorkOrder)
class WorkOrderAdmin(admin.ModelAdmin):
    list_display = ["id", "business", "customer", "get_status", "service", "received_at", "total_amount"]
    list_filter = ["business", "reservation__status", "received_at"]
    search_fields = ["customer__name", "vehicle__license_plate", "customer__email"]
    list_per_page = 25
    ordering = ["-received_at"]
    readonly_fields = [
        "business", "get_status", "paid_amount", "balance_due", "material_cost",
        "created_at", "updated_at",
    ]
    autocomplete_fields = ["customer", "vehicle", "service"]
    save_on_top = True
    list_select_related = ["business", "customer", "service", "reservation"]
    inlines = [MaterialConsumptionInline]
    actions = ["mark_in_progress", "mark_ready", "mark_delivered", "export_as_csv"]
    fieldsets = (
        (None, {"fields": ("business", "customer", "vehicle", "service", "reservation")}),
        ("Estado y montos", {"fields": ("get_status", "total_amount", "paid_amount", "balance_due", "material_cost")}),
        ("Tiempos", {"fields": ("received_at", "estimated_delivery_at", "created_at", "updated_at")}),
        ("Notas internas", {"fields": ("internal_notes",)}),
    )

    def get_status(self, obj):
        status = obj.status
        color = STATUS_COLORS.get(status, "#6c757d")
        label = obj.reservation.get_status_display() if obj.reservation_id else status
        return format_html('<span style="color: {}; font-weight: bold;">{}</span>', color, label)

    get_status.short_description = "Estado"

    @admin.action(description="Marcar en proceso")
    def mark_in_progress(self, request, queryset):
        for wo in queryset.select_related("reservation"):
            wo.status = WorkOrder.Status.IN_PROGRESS
            wo.save()
        self.message_user(request, f"{queryset.count()} orden(es) actualizadas.")

    @admin.action(description="Marcar como listo")
    def mark_ready(self, request, queryset):
        for wo in queryset.select_related("reservation"):
            wo.status = WorkOrder.Status.READY
            wo.save()
        self.message_user(request, f"{queryset.count()} orden(es) actualizadas.")

    @admin.action(description="Marcar como entregado")
    def mark_delivered(self, request, queryset):
        for wo in queryset.select_related("reservation"):
            wo.status = WorkOrder.Status.DELIVERED
            wo.save()
        self.message_user(request, f"{queryset.count()} orden(es) actualizadas.")

    @admin.action(description="Exportar como CSV")
    def export_as_csv(self, request, queryset):
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = "attachment; filename=ordenes.csv"
        writer = csv.writer(response)
        writer.writerow(["ID", "Negocio", "Cliente", "Vehículo", "Servicio", "Estado", "Recibido", "Monto", "Pagado", "Saldo"])
        for obj in queryset.select_related("business", "customer", "vehicle", "service", "reservation"):
            writer.writerow([
                obj.id, obj.business.name, obj.customer.name, str(obj.vehicle), obj.service.name,
                obj.status, obj.received_at.strftime("%Y-%m-%d %H:%M"),
                obj.total_amount, obj.paid_amount, obj.balance_due,
            ])
        return response
