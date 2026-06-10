from django.contrib import admin

from .models import FixedExpense, FixedExpenseOccurrence


class FixedExpenseOccurrenceInline(admin.TabularInline):
    model = FixedExpenseOccurrence
    extra = 0
    fields = ["period_date", "amount", "status", "method", "paid_at", "cash_movement"]
    readonly_fields = ["period_date", "amount", "cash_movement"]
    show_change_link = True


@admin.register(FixedExpense)
class FixedExpenseAdmin(admin.ModelAdmin):
    list_display = [
        "concept", "business", "amount", "interval_count",
        "interval_unit", "is_active", "auto_pay", "last_generated_for",
    ]
    list_filter = ["business", "is_active", "auto_pay", "interval_unit"]
    search_fields = ["concept", "supplier__name"]
    readonly_fields = ["cycles_generated", "last_generated_for", "created_at", "updated_at"]
    autocomplete_fields = ["business", "supplier"]
    list_select_related = ["business", "supplier"]
    inlines = [FixedExpenseOccurrenceInline]
    save_on_top = True
    fieldsets = (
        (None, {"fields": ("business", "concept", "supplier", "amount")}),
        ("Periodicidad", {
            "fields": (
                "interval_unit", "interval_count", "start_date",
                "due_offset_days", "end_date", "max_cycles", "is_active",
            ),
        }),
        ("Pago automatico", {"fields": ("auto_pay", "payment_method")}),
        ("Clasificacion", {"fields": ("expense_category", "expense_subcategory", "notes")}),
        ("Estado", {"fields": ("cycles_generated", "last_generated_for", "created_at", "updated_at")}),
    )


@admin.register(FixedExpenseOccurrence)
class FixedExpenseOccurrenceAdmin(admin.ModelAdmin):
    list_display = [
        "id", "business", "fixed_expense", "period_date",
        "amount", "status", "method", "paid_at",
    ]
    list_filter = ["business", "status", "method", "period_date"]
    search_fields = ["fixed_expense__concept"]
    date_hierarchy = "period_date"
    readonly_fields = [
        "business", "fixed_expense", "period_date", "amount",
        "cash_movement", "created_at", "updated_at",
    ]
    list_select_related = ["business", "fixed_expense"]
