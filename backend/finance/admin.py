import csv

from django.contrib import admin
from django.http import HttpResponse

from .models import CashClosure, CashMovement, Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["id", "paid_at", "work_order", "amount", "method", "payment_type"]
    list_filter = ["method", "payment_type", "paid_at"]
    search_fields = ["work_order__customer__name", "work_order__id", "notes"]
    date_hierarchy = "paid_at"
    list_per_page = 25
    ordering = ["-paid_at", "-id"]
    readonly_fields = ["created_at"]
    autocomplete_fields = ["work_order"]
    save_on_top = True
    list_select_related = ["work_order", "work_order__customer"]
    actions = ["export_as_csv"]

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    @admin.action(description="Exportar como CSV")
    def export_as_csv(self, request, queryset):
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = "attachment; filename=pagos.csv"
        writer = csv.writer(response)
        writer.writerow(["ID", "Fecha", "Orden", "Cliente", "Monto", "Método", "Tipo", "Notas"])
        for obj in queryset.select_related("work_order", "work_order__customer"):
            writer.writerow([
                obj.id, obj.paid_at.strftime("%Y-%m-%d %H:%M"), obj.work_order_id,
                obj.work_order.customer.name, obj.amount,
                obj.get_method_display(), obj.get_payment_type_display(), obj.notes,
            ])
        return response


@admin.register(CashMovement)
class CashMovementAdmin(admin.ModelAdmin):
    list_display = ["id", "occurred_at", "movement_type", "category", "subcategory", "amount", "description"]
    list_filter = ["movement_type", "category", "occurred_at"]
    search_fields = ["category", "subcategory", "description"]
    date_hierarchy = "occurred_at"
    list_per_page = 25
    ordering = ["-occurred_at", "-id"]
    readonly_fields = ["created_at", "payment", "material_purchase", "stock_movement"]
    save_on_top = True
    list_select_related = True

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(CashClosure)
class CashClosureAdmin(admin.ModelAdmin):
    list_display = ["day", "total_income", "total_expense", "balance", "cashflow_balance", "closed_by"]
    list_filter = ["day", "closed_by"]
    search_fields = ["day", "notes"]
    date_hierarchy = "day"
    list_per_page = 25
    ordering = ["-day"]
    readonly_fields = [
        "day", "total_income", "total_expense", "balance",
        "cashflow_income", "cashflow_expense", "cashflow_balance",
        "closed_by", "closed_at",
    ]
    save_on_top = True

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
