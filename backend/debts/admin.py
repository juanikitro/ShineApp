from django.contrib import admin
from django.utils.html import format_html

from .models import Debt, DebtPayment


class DebtPaymentInline(admin.TabularInline):
    model = DebtPayment
    extra = 0
    readonly_fields = ["created_at"]
    fields = ["paid_at", "amount", "method", "notes", "created_at"]
    show_change_link = True


STATUS_COLORS = {
    "pending": "#fd7e14",
    "partial": "#0d6efd",
    "paid": "#198754",
    "overdue": "#dc3545",
}


@admin.register(Debt)
class DebtAdmin(admin.ModelAdmin):
    list_display = [
        "concept", "business", "creditor", "supplier", "principal_amount",
        "get_status_badge", "origin_date", "due_date",
    ]
    list_filter = ["business", "origin_date", "due_date", "expense_category"]
    search_fields = ["concept", "creditor", "supplier__name"]
    date_hierarchy = "origin_date"
    list_per_page = 25
    ordering = ["-origin_date", "-id"]
    readonly_fields = ["created_at", "updated_at", "total_paid", "balance_due"]
    autocomplete_fields = ["business", "supplier"]
    inlines = [DebtPaymentInline]
    save_on_top = True
    list_select_related = ["business", "supplier"]
    fieldsets = (
        (None, {"fields": ("business", "concept", "creditor", "supplier", "principal_amount", "origin_date", "due_date")}),
        ("Clasificación", {"fields": ("expense_category", "expense_subcategory")}),
        ("Resumen", {"fields": ("total_paid", "balance_due")}),
        ("Notas y auditoría", {"fields": ("notes", "cash_movement", "created_at", "updated_at")}),
    )

    def get_status_badge(self, obj):
        status = obj.status
        color = STATUS_COLORS.get(status, "#6c757d")
        labels = {
            "pending": "Pendiente", "partial": "Parcial",
            "paid": "Pagada", "overdue": "Vencida",
        }
        return format_html('<span style="color: {}; font-weight: bold;">{}</span>', color, labels.get(status, status))

    get_status_badge.short_description = "Estado"

    def total_paid(self, obj):
        return obj.total_paid

    total_paid.short_description = "Pagado"

    def balance_due(self, obj):
        return obj.balance_due

    balance_due.short_description = "Saldo"


@admin.register(DebtPayment)
class DebtPaymentAdmin(admin.ModelAdmin):
    list_display = ["id", "business", "debt", "amount", "method", "paid_at"]
    list_filter = ["business", "method", "paid_at"]
    search_fields = ["debt__concept", "notes"]
    date_hierarchy = "paid_at"
    list_per_page = 25
    ordering = ["-paid_at", "-id"]
    readonly_fields = ["business", "created_at"]
    autocomplete_fields = ["debt"]
    list_select_related = ["business", "debt"]
