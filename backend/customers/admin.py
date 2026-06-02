import csv

from django.contrib import admin
from django.db.models import Count
from django.http import HttpResponse

from .models import Customer, Vehicle


class VehicleInline(admin.TabularInline):
    model = Vehicle
    extra = 0
    fields = ["license_plate", "brand", "model", "color", "vehicle_type", "is_active"]
    show_change_link = True
    can_delete = False


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ["name", "business", "email", "phone", "vehicles_count", "is_active", "created_at"]
    list_filter = ["business", "is_active", "created_at"]
    search_fields = ["name", "email", "phone"]
    list_per_page = 25
    ordering = ["-created_at"]
    readonly_fields = ["created_at", "updated_at"]
    autocomplete_fields = ["business"]
    inlines = [VehicleInline]
    save_on_top = True
    list_select_related = ["business"]
    actions = ["export_as_csv"]

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_vehicles_count=Count("vehicles"))

    def vehicles_count(self, obj):
        return obj._vehicles_count

    vehicles_count.short_description = "Vehículos"
    vehicles_count.admin_order_field = "_vehicles_count"

    @admin.action(description="Exportar como CSV")
    def export_as_csv(self, request, queryset):
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = "attachment; filename=clientes.csv"
        writer = csv.writer(response)
        writer.writerow(["ID", "Negocio", "Nombre", "Email", "Teléfono", "CUIT", "Activo", "Alta"])
        for obj in queryset.select_related("business"):
            writer.writerow([
                obj.id, obj.business.name, obj.name, obj.email, obj.phone,
                obj.tax_id, obj.is_active, obj.created_at.strftime("%Y-%m-%d"),
            ])
        return response


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ["license_plate", "business", "brand", "model", "color", "vehicle_type", "customer", "is_active"]
    list_filter = ["business", "vehicle_type", "is_active"]
    search_fields = ["license_plate", "brand", "model", "customer__name"]
    list_per_page = 25
    ordering = ["license_plate"]
    autocomplete_fields = ["customer"]
    readonly_fields = ["business", "created_at", "updated_at"]
    list_select_related = ["business", "customer"]
