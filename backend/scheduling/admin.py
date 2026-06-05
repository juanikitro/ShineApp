import csv

from django.contrib import admin
from django.http import HttpResponse
from django.utils import timezone

from .models import DailyCapacity, Reservation, ReservationItem


class ReservationItemInline(admin.TabularInline):
    model = ReservationItem
    extra = 0
    readonly_fields = ["line_total"]
    fields = ["service", "description", "quantity", "unit_price", "line_total"]
    autocomplete_fields = ["service"]


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ["id", "business", "day", "customer", "vehicle", "service", "status", "created_at"]
    list_filter = ["business", "status", "day"]
    search_fields = ["customer__name", "vehicle__license_plate", "customer__email", "customer__phone"]
    date_hierarchy = "day"
    list_per_page = 25
    ordering = ["-day", "-id"]
    readonly_fields = ["business", "created_at", "updated_at"]
    autocomplete_fields = ["customer", "vehicle", "service"]
    inlines = [ReservationItemInline]
    save_on_top = True
    list_select_related = ["business", "customer", "vehicle", "service"]
    actions = ["confirm_reservations", "cancel_reservations", "export_as_csv"]

    @admin.action(description="Confirmar reservas seleccionadas")
    def confirm_reservations(self, request, queryset):
        updated = queryset.filter(status=Reservation.Status.PENDING).update(
            status=Reservation.Status.CONFIRMED,
            updated_at=timezone.now(),
        )
        self.message_user(request, f"{updated} reserva(s) confirmada(s).")

    @admin.action(description="Cancelar reservas seleccionadas")
    def cancel_reservations(self, request, queryset):
        updated = queryset.exclude(status=Reservation.Status.CANCELED).update(
            status=Reservation.Status.CANCELED,
            updated_at=timezone.now(),
        )
        self.message_user(request, f"{updated} reserva(s) cancelada(s).")

    @admin.action(description="Exportar como CSV")
    def export_as_csv(self, request, queryset):
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = "attachment; filename=reservas.csv"
        writer = csv.writer(response)
        writer.writerow(["ID", "Negocio", "Día", "Cliente", "Vehículo", "Servicio", "Estado", "Hora inicio", "Notas"])
        for obj in queryset.select_related("business", "customer", "vehicle", "service"):
            writer.writerow([
                obj.id, obj.business.name, obj.day, obj.customer.name, str(obj.vehicle),
                obj.service.name, obj.get_status_display(),
                obj.start_time or "", obj.notes,
            ])
        return response


@admin.register(DailyCapacity)
class DailyCapacityAdmin(admin.ModelAdmin):
    list_display = ["day", "business", "max_slots_wash", "max_slots_detailing", "notes"]
    list_editable = ["max_slots_wash", "max_slots_detailing"]
    list_filter = ["business"]
    search_fields = ["day", "notes"]
    list_per_page = 25
    ordering = ["-day"]
    autocomplete_fields = ["business"]
    list_select_related = ["business"]
