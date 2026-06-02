from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html

from .models import Quote, QuoteItem


class QuoteItemInline(admin.TabularInline):
    model = QuoteItem
    extra = 0
    readonly_fields = ["line_total"]
    fields = ["service", "description", "quantity", "unit_price", "line_total"]
    autocomplete_fields = ["service"]


@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    list_display = ["public_code", "customer", "quote_date", "total", "get_status_badge", "valid_until"]
    list_filter = ["status", "quote_date"]
    search_fields = ["public_code", "customer__name", "customer__email", "customer_snapshot_name"]
    date_hierarchy = "quote_date"
    list_per_page = 25
    ordering = ["-quote_date", "-id"]
    readonly_fields = [
        "public_code", "subtotal", "discount_amount", "taxable_amount",
        "tax_amount", "total", "sent_at", "created_at", "updated_at",
    ]
    autocomplete_fields = ["customer", "vehicle"]
    inlines = [QuoteItemInline]
    save_on_top = True
    list_select_related = ["customer"]
    actions = ["approve_quotes", "reject_quotes"]
    fieldsets = (
        (None, {"fields": ("public_code", "customer", "vehicle", "status", "quote_date", "valid_until", "observations")}),
        ("Montos", {"fields": ("subtotal", "discount_rate", "discount_amount", "tax_rate", "taxable_amount", "tax_amount", "total")}),
        ("Datos del negocio (snapshot)", {
            "classes": ("collapse",),
            "fields": ("business_name", "business_address", "business_cuit", "business_contact_phone", "business_contact_email"),
        }),
        ("Datos del cliente (snapshot)", {
            "classes": ("collapse",),
            "fields": ("customer_snapshot_name", "customer_snapshot_tax_id", "customer_snapshot_billing_address", "vehicle_snapshot_label"),
        }),
        ("Condiciones", {"fields": ("terms", "payment_instructions")}),
        ("Auditoría", {"fields": ("sent_at", "created_at", "updated_at")}),
    )

    def get_status_badge(self, obj):
        colors = {
            "draft": "#6c757d",
            "sent": "#0d6efd",
            "accepted": "#198754",
            "rejected": "#dc3545",
        }
        color = colors.get(obj.status, "#6c757d")
        return format_html('<span style="color: {}; font-weight: bold;">{}</span>', color, obj.get_status_display())

    get_status_badge.short_description = "Estado"

    @admin.action(description="Aprobar cotizaciones seleccionadas")
    def approve_quotes(self, request, queryset):
        updated = queryset.exclude(status=Quote.Status.ACCEPTED).update(
            status=Quote.Status.ACCEPTED,
            updated_at=timezone.now(),
        )
        self.message_user(request, f"{updated} cotizacion(es) aprobada(s).")

    @admin.action(description="Rechazar cotizaciones seleccionadas")
    def reject_quotes(self, request, queryset):
        updated = queryset.exclude(status=Quote.Status.REJECTED).update(
            status=Quote.Status.REJECTED,
            updated_at=timezone.now(),
        )
        self.message_user(request, f"{updated} cotizacion(es) rechazada(s).")
