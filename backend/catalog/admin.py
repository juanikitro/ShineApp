from django.contrib import admin

from .models import Sector, Service


@admin.register(Sector)
class SectorAdmin(admin.ModelAdmin):
    list_display = ["name", "business", "key", "order", "default_capacity", "public_visible", "is_active"]
    list_editable = ["order", "default_capacity", "public_visible", "is_active"]
    list_filter = ["business", "is_active", "public_visible"]
    search_fields = ["name", "key"]
    list_per_page = 25
    ordering = ["business", "order", "name"]
    readonly_fields = ["key", "created_at", "updated_at"]
    autocomplete_fields = ["business"]
    list_select_related = ["business"]


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ["name", "business", "service_type", "sector", "base_price", "estimated_duration_minutes", "is_active"]
    list_editable = ["base_price", "is_active"]
    list_filter = ["business", "service_type", "sector", "is_active"]
    search_fields = ["name"]
    list_per_page = 25
    ordering = ["service_type", "name"]
    readonly_fields = ["created_at", "updated_at"]
    autocomplete_fields = ["business", "sector"]
    list_select_related = ["business", "sector"]
    fieldsets = (
        (None, {"fields": ("business", "name", "service_type", "sector", "icon", "is_active", "notes")}),
        ("Precios", {"fields": ("base_price", "price_moto", "price_auto", "price_camioneta", "price_combi")}),
        ("Operación", {"fields": ("estimated_duration_minutes", "created_at", "updated_at")}),
    )
