from django.contrib import admin
from django.utils.html import format_html

from .models import (
    Material,
    MaterialConsumption,
    MaterialOpenUnit,
    MaterialPurchase,
    StockMovement,
    StockMovementLine,
    Supplier,
    Tool,
)


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ["name", "business", "category", "contact_name", "phone", "email", "is_active"]
    list_filter = ["business", "category", "is_active"]
    search_fields = ["name", "legal_name", "contact_name", "phone", "email", "tax_id"]
    list_per_page = 25
    ordering = ["name"]
    readonly_fields = ["created_at", "updated_at"]
    autocomplete_fields = ["business"]
    list_select_related = ["business"]
    fieldsets = (
        (None, {"fields": ("business", "name", "legal_name", "category", "is_active")}),
        ("Contacto", {"fields": ("contact_name", "phone", "email", "website", "address")}),
        ("Fiscal", {"fields": ("tax_id", "tax_condition")}),
        ("Notas y auditoría", {"fields": ("notes", "created_at", "updated_at")}),
    )


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = [
        "name", "business", "category", "unit", "stock_quantity_display",
        "minimum_stock", "estimated_unit_cost", "is_active",
    ]
    list_filter = ["business", "category", "is_active", "unit"]
    search_fields = ["name", "sku", "category"]
    list_per_page = 25
    ordering = ["name"]
    readonly_fields = ["created_at", "updated_at"]
    autocomplete_fields = ["business"]
    list_select_related = ["business"]
    save_on_top = True
    fieldsets = (
        (None, {"fields": ("business", "name", "sku", "category", "unit", "presentation", "is_active", "notes")}),
        ("Stock", {"fields": ("stock_quantity", "minimum_stock", "estimated_unit_cost")}),
        ("Auditoría", {"fields": ("created_at", "updated_at")}),
    )

    def stock_quantity_display(self, obj):
        if obj.minimum_stock and obj.stock_quantity < obj.minimum_stock:
            return format_html(
                '<span style="color: #dc3545; font-weight: bold;" title="Stock bajo el mínimo">'
                "⚠ {}"
                "</span>",
                obj.stock_quantity,
            )
        return obj.stock_quantity

    stock_quantity_display.short_description = "Stock actual"
    stock_quantity_display.admin_order_field = "stock_quantity"


class StockMovementLineInline(admin.TabularInline):
    model = StockMovementLine
    extra = 0
    readonly_fields = ["line_total", "estimated_total_cost", "stock_delta"]
    fields = ["material", "quantity", "unit_price", "line_total", "estimated_unit_cost", "estimated_total_cost", "stock_delta"]
    autocomplete_fields = ["material"]


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ["id", "business", "movement_type", "occurred_on", "supplier", "total_amount", "affects_cash", "payment_method"]
    list_filter = ["business", "movement_type", "affects_cash", "payment_method", "occurred_on"]
    search_fields = ["supplier__name", "document_number", "notes"]
    date_hierarchy = "occurred_on"
    list_per_page = 25
    ordering = ["-occurred_on", "-id"]
    readonly_fields = ["created_at", "updated_at"]
    autocomplete_fields = ["business", "supplier", "customer", "reservation", "work_order"]
    inlines = [StockMovementLineInline]
    save_on_top = True
    list_select_related = ["business", "supplier"]
    fieldsets = (
        (None, {"fields": ("business", "movement_type", "occurred_on", "supplier", "customer")}),
        ("Documento", {"fields": ("document_type", "document_number", "document_file")}),
        ("Pago y caja", {"fields": ("payment_method", "total_amount", "affects_cash", "products_received")}),
        ("Relaciones", {"fields": ("reservation", "work_order")}),
        ("Notas y auditoría", {"fields": ("notes", "created_at", "updated_at")}),
    )


@admin.register(MaterialPurchase)
class MaterialPurchaseAdmin(admin.ModelAdmin):
    list_display = ["business", "material", "purchased_at", "quantity", "total_cost", "affects_cash"]
    list_filter = ["business", "affects_cash", "purchased_at"]
    search_fields = ["material__name", "observations"]
    date_hierarchy = "purchased_at"
    list_per_page = 25
    ordering = ["-purchased_at", "-id"]
    readonly_fields = ["business", "created_at"]
    autocomplete_fields = ["material"]
    list_select_related = ["business", "material"]


@admin.register(MaterialConsumption)
class MaterialConsumptionAdmin(admin.ModelAdmin):
    list_display = ["business", "material", "work_order", "consumed_at", "quantity", "estimated_total_cost"]
    list_filter = ["business", "consumed_at", "material__category"]
    search_fields = ["material__name", "work_order__customer__name", "observations"]
    date_hierarchy = "consumed_at"
    list_per_page = 25
    ordering = ["-consumed_at", "-id"]
    readonly_fields = ["business", "created_at"]
    autocomplete_fields = ["material", "work_order"]
    list_select_related = ["business", "material", "work_order"]


@admin.register(MaterialOpenUnit)
class MaterialOpenUnitAdmin(admin.ModelAdmin):
    list_display = ["business", "material", "status", "opened_at", "finished_at", "stock_quantity_to_decrement"]
    list_filter = ["business", "status", "opened_at"]
    search_fields = ["material__name"]
    date_hierarchy = "opened_at"
    list_per_page = 25
    ordering = ["-opened_at", "-id"]
    readonly_fields = ["business", "created_at"]
    autocomplete_fields = ["material", "opened_by_work_order"]
    list_select_related = ["business", "material"]


@admin.register(Tool)
class ToolAdmin(admin.ModelAdmin):
    list_display = ["name", "business", "quantity", "status", "unit_value", "purchased_at", "is_active"]
    list_filter = ["business", "status", "is_active"]
    search_fields = ["name", "notes"]
    list_per_page = 25
    ordering = ["name"]
    readonly_fields = ["created_at", "updated_at"]
    autocomplete_fields = ["business"]
    list_select_related = ["business"]
