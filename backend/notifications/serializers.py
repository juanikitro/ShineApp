from decimal import Decimal

from django.db.models import Q
from django.db import transaction
from rest_framework import serializers

from catalog.models import Service
from catalog.serializers import PRICE_BY_TYPE_FIELDS
from customers.models import Customer, Vehicle
from quotes.models import Quote, QuoteItem
from quotes.serializers import QuoteSerializer
from scheduling.models import Reservation
from scheduling.serializers import ReservationSerializer

from .models import PublicRequest, PublicRequestItem


def digits_only(value):
    return "".join(character for character in str(value or "") if character.isdigit())


def public_request_suggestions_payload(customers, vehicles):
    return {
        "customers": [
            {
                "id": customer.id,
                "label": customer.name,
                "name": customer.name,
                "phone": customer.phone,
                "email": customer.email,
            }
            for customer in customers
        ],
        "vehicles": [
            {
                "id": vehicle.id,
                "label": str(vehicle),
                "customer": vehicle.customer_id,
                "customer_name": vehicle.customer.name,
                "license_plate": vehicle.license_plate,
            }
            for vehicle in vehicles
        ],
    }


def build_public_request_suggestions_map(public_requests):
    requests = list(public_requests)
    if not requests:
        return {}

    business_ids = {public_request.business_id for public_request in requests}
    request_emails = {
        (public_request.customer_email or "").strip().lower()
        for public_request in requests
        if (public_request.customer_email or "").strip()
    }
    request_phone_digits = {
        digits_only(public_request.customer_phone)
        for public_request in requests
        if digits_only(public_request.customer_phone)
    }
    request_plates = {
        (public_request.vehicle_license_plate or "").strip().upper()
        for public_request in requests
        if (public_request.vehicle_license_plate or "").strip()
    }

    customers_by_email = {}
    customers_by_phone = {}
    if request_emails or request_phone_digits:
        for customer in Customer.objects.filter(
            business_id__in=business_ids,
            is_active=True,
        ).order_by("name", "id"):
            email = (customer.email or "").strip().lower()
            phone = digits_only(customer.phone)
            if email in request_emails:
                customers_by_email.setdefault(email, []).append(customer)
            if phone in request_phone_digits:
                customers_by_phone.setdefault(phone, []).append(customer)

    vehicles_by_plate = {}
    if request_plates:
        plate_query = Q()
        for plate in request_plates:
            plate_query |= Q(license_plate__iexact=plate)
        for vehicle in (
            Vehicle.objects.filter(
                business_id__in=business_ids,
                is_active=True,
            )
            .filter(plate_query)
            .select_related("customer")
            .order_by("id")
        ):
            vehicles_by_plate.setdefault(vehicle.license_plate.upper(), []).append(vehicle)

    suggestions = {}
    for public_request in requests:
        email = (public_request.customer_email or "").strip().lower()
        phone = digits_only(public_request.customer_phone)
        plate = (public_request.vehicle_license_plate or "").strip().upper()
        customer_matches = [
            *customers_by_email.get(email, []),
            *customers_by_phone.get(phone, []),
        ]
        deduped_customers = []
        seen_customer_ids = set()
        for customer in sorted(customer_matches, key=lambda item: (item.name.lower(), item.id)):
            if customer.id in seen_customer_ids:
                continue
            seen_customer_ids.add(customer.id)
            deduped_customers.append(customer)
            if len(deduped_customers) >= 5:
                break
        suggestions[public_request.id] = public_request_suggestions_payload(
            deduped_customers,
            vehicles_by_plate.get(plate, [])[:5],
        )
    return suggestions


class PublicLandingServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = [
            "id",
            "name",
            "icon",
            "sector",
            "estimated_duration_minutes",
            "notes",
            "base_price",
            *PRICE_BY_TYPE_FIELDS,
        ]
        read_only_fields = fields

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self.context.get("show_description", True):
            data.pop("notes", None)
        if not self.context.get("show_price", False):
            for field in ("base_price", *PRICE_BY_TYPE_FIELDS):
                data.pop(field, None)
        return data


class PublicRequestItemSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name", read_only=True)
    service_icon = serializers.CharField(source="service.icon", read_only=True)

    class Meta:
        model = PublicRequestItem
        fields = [
            "id",
            "service",
            "service_name",
            "service_icon",
            "description",
            "quantity",
        ]
        read_only_fields = fields


class PublicLandingRequestSerializer(serializers.ModelSerializer):
    request_type = serializers.ChoiceField(
        choices=PublicRequest.RequestType.choices,
        required=False,
    )
    service_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        write_only=True,
    )
    website = serializers.CharField(
        required=False,
        allow_blank=True,
        write_only=True,
    )
    push_subscription = serializers.JSONField(
        required=False,
        allow_null=True,
        write_only=True,
    )

    class Meta:
        model = PublicRequest
        fields = [
            "id",
            "request_type",
            "customer_name",
            "customer_phone",
            "customer_email",
            "vehicle_license_plate",
            "vehicle_brand",
            "vehicle_model",
            "vehicle_color",
            "vehicle_type",
            "preferred_day",
            "preferred_time",
            "message",
            "service_ids",
            "website",
            "push_subscription",
            "status",
            "created_at",
        ]
        read_only_fields = ["id", "status", "created_at"]

    def to_internal_value(self, data):
        data = data.copy()
        for field_name in ("preferred_day", "preferred_time"):
            if data.get(field_name) == "":
                data[field_name] = None
        return super().to_internal_value(data)

    def validate_customer_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("El nombre es obligatorio.")
        return name

    def validate_customer_phone(self, value):
        return value.strip()

    def validate_customer_email(self, value):
        return value.strip()

    def validate_vehicle_license_plate(self, value):
        return value.strip().upper()

    def validate_vehicle_brand(self, value):
        return value.strip()

    def validate_vehicle_model(self, value):
        return value.strip()

    def validate_vehicle_color(self, value):
        return value.strip()

    def validate_message(self, value):
        return value.strip()

    def validate_push_subscription(self, value):
        if value is None:
            return None
        if not isinstance(value, dict) or not value.get("endpoint"):
            raise serializers.ValidationError("Formato de suscripcion invalido.")
        return value

    def validate(self, attrs):
        business = self.context["business"]
        profile = self.context["profile"]
        if attrs.pop("website", ""):
            raise serializers.ValidationError({"website": "No se pudo enviar la solicitud."})
        preferred_day = attrs.get("preferred_day")
        request_type = (
            PublicRequest.RequestType.BOOKING
            if preferred_day
            else PublicRequest.RequestType.QUOTE
        )
        attrs["request_type"] = request_type
        if not preferred_day:
            attrs["preferred_time"] = None
        preferred_time = attrs.get("preferred_time")
        if preferred_time and request_type == PublicRequest.RequestType.BOOKING:
            opening = profile.opening_time
            closing = profile.closing_time
            if opening and closing:
                overnight = closing <= opening
                if overnight:
                    in_range = preferred_time >= opening or preferred_time <= closing
                    if not in_range:
                        raise serializers.ValidationError(
                            {"preferred_time": "El horario solicitado esta fuera del horario de atencion."}
                        )
                else:
                    if preferred_time < opening:
                        raise serializers.ValidationError(
                            {"preferred_time": "El horario solicitado es antes del horario de apertura."}
                        )
                    if preferred_time > closing:
                        raise serializers.ValidationError(
                            {"preferred_time": "El horario solicitado es despues del horario de cierre."}
                        )
            else:
                if opening and preferred_time < opening:
                    raise serializers.ValidationError(
                        {"preferred_time": "El horario solicitado es antes del horario de apertura."}
                    )
                if closing and preferred_time > closing:
                    raise serializers.ValidationError(
                        {"preferred_time": "El horario solicitado es despues del horario de cierre."}
                    )
        if request_type == PublicRequest.RequestType.BOOKING and not profile.allow_public_booking_requests:
            raise serializers.ValidationError({"request_type": "El negocio no acepta solicitudes de turno."})
        if request_type == PublicRequest.RequestType.QUOTE and not profile.allow_public_quote_requests:
            raise serializers.ValidationError({"request_type": "El negocio no acepta solicitudes de cotizacion."})
        if not attrs.get("customer_phone") and not attrs.get("customer_email"):
            raise serializers.ValidationError("Deja un telefono o un email de contacto.")

        service_ids = attrs.pop("service_ids", [])
        if not service_ids:
            raise serializers.ValidationError({"service_ids": "Selecciona al menos un servicio."})
        services = list(
            Service.objects.filter(
                business=business,
                is_active=True,
                id__in=service_ids,
            )
        )
        if len(services) != len(set(service_ids)):
            raise serializers.ValidationError({"service_ids": "Uno o mas servicios no estan disponibles."})
        service_by_id = {service.id: service for service in services}
        ordered_services = [service_by_id[service_id] for service_id in service_ids]
        attrs["services"] = ordered_services

        if preferred_day and request_type == PublicRequest.RequestType.BOOKING:
            if profile.enforce_capacity_limit:
                self._validate_capacity(business, preferred_day, ordered_services)
            if preferred_time and not profile.allow_overlapping_reservations:
                duration_minutes = sum(
                    int(getattr(service, "estimated_duration_minutes", 0) or 0)
                    for service in ordered_services
                ) or 60
                if self._overlap_exists(business, preferred_day, preferred_time, duration_minutes):
                    raise serializers.ValidationError(
                        {"preferred_time": "Ese horario se solapa con otra reserva existente."}
                    )

        return attrs

    @staticmethod
    def _validate_capacity(business, day, services):
        used_per_sector = {}
        sector_objects = {}
        for service in services:
            sector = getattr(service, "sector", None)
            if sector is None:
                continue
            used_per_sector.setdefault(sector.id, 0)
            used_per_sector[sector.id] += 1
            sector_objects[sector.id] = sector
        for sector_id, requested in used_per_sector.items():
            sector = sector_objects[sector_id]
            capacity = Reservation.capacity_for_day(day, business=business, sector=sector)
            used_slots = Reservation.used_slots_for_day(day, business=business, sector=sector)
            if used_slots + requested > capacity:
                raise serializers.ValidationError(
                    {
                        "preferred_day": (
                            f"La capacidad de turnos de {sector.name} para este dia ya esta completa."
                        )
                    }
                )

    @staticmethod
    def _overlap_exists(business, day, start_time, duration_minutes):
        start_minutes = start_time.hour * 60 + start_time.minute
        end_minutes = start_minutes + max(int(duration_minutes), 0)
        reservations = (
            Reservation.objects.filter(business=business, day=day)
            .filter(status__in=Reservation.active_statuses())
            .exclude(start_time__isnull=True)
        )
        for reservation in reservations:
            if not reservation.start_time:
                continue
            existing_start = reservation.start_time.hour * 60 + reservation.start_time.minute
            existing_end = existing_start + max(int(reservation.estimated_duration_minutes or 0), 0)
            if start_minutes < existing_end and existing_start < end_minutes:
                return True
        return False

    @transaction.atomic
    def create(self, validated_data):
        services = validated_data.pop("services")
        public_request = PublicRequest.objects.create(
            business=self.context["business"],
            ip_address=self.context.get("ip_address") or None,
            user_agent=self.context.get("user_agent", "")[:300],
            **validated_data,
        )
        for service in services:
            PublicRequestItem.objects.create(
                public_request=public_request,
                service=service,
                description=service.name,
                quantity=Decimal("1.00"),
            )
        return public_request


class PublicRequestSerializer(serializers.ModelSerializer):
    request_type_label = serializers.CharField(source="get_request_type_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    vehicle_type_label = serializers.CharField(source="get_vehicle_type_display", read_only=True)
    items = PublicRequestItemSerializer(many=True, read_only=True)
    suggestions = serializers.SerializerMethodField()

    class Meta:
        model = PublicRequest
        fields = [
            "id",
            "request_type",
            "request_type_label",
            "status",
            "status_label",
            "customer_name",
            "customer_phone",
            "customer_email",
            "vehicle_license_plate",
            "vehicle_brand",
            "vehicle_model",
            "vehicle_color",
            "vehicle_type",
            "vehicle_type_label",
            "preferred_day",
            "preferred_time",
            "message",
            "items",
            "suggestions",
            "converted_reservation",
            "converted_quote",
            "converted_at",
            "archived_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_suggestions(self, obj):
        suggestions_map = self.context.get("public_request_suggestions_map")
        if suggestions_map is not None and obj.id in suggestions_map:
            return suggestions_map[obj.id]

        phone_digits = digits_only(obj.customer_phone)
        email = (obj.customer_email or "").strip().lower()
        customers = []
        if phone_digits or email:
            for customer in Customer.objects.filter(business=obj.business, is_active=True).order_by("name", "id"):
                if (email and customer.email.lower() == email) or (
                    phone_digits and digits_only(customer.phone) == phone_digits
                ):
                    customers.append(customer)
                if len(customers) >= 5:
                    break

        vehicles = []
        if obj.vehicle_license_plate:
            vehicles = Vehicle.objects.filter(
                business=obj.business,
                is_active=True,
                license_plate__iexact=obj.vehicle_license_plate,
            ).select_related("customer")[:5]

        return public_request_suggestions_payload(customers, vehicles)


class PublicRequestConvertSerializer(serializers.Serializer):
    customer = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        required=False,
        allow_null=True,
    )
    vehicle = serializers.PrimaryKeyRelatedField(
        queryset=Vehicle.objects.all(),
        required=False,
        allow_null=True,
    )

    def validate(self, attrs):
        public_request = self.context["public_request"]
        business = public_request.business
        customer = attrs.get("customer")
        vehicle = attrs.get("vehicle")
        if public_request.status != PublicRequest.Status.PENDING:
            raise serializers.ValidationError("La solicitud ya fue gestionada.")
        if customer and customer.business_id != business.id:
            raise serializers.ValidationError({"customer": "El cliente pertenece a otro negocio."})
        if vehicle and vehicle.business_id != business.id:
            raise serializers.ValidationError({"vehicle": "El vehiculo pertenece a otro negocio."})
        if customer and vehicle and vehicle.customer_id != customer.id:
            raise serializers.ValidationError("El vehiculo seleccionado no pertenece al cliente.")
        if vehicle and not customer:
            attrs["customer"] = vehicle.customer
        if public_request.request_type == PublicRequest.RequestType.BOOKING and not public_request.preferred_day:
            raise serializers.ValidationError({"preferred_day": "La solicitud no tiene fecha preferida."})
        if not public_request.items.exists():
            raise serializers.ValidationError({"items": "La solicitud no tiene servicios."})
        return attrs

    @transaction.atomic
    def save(self, **kwargs):
        public_request = self.context["public_request"]
        request = self.context.get("request")
        customer = self.validated_data.get("customer") or self._create_customer(public_request)
        vehicle = self.validated_data.get("vehicle") or self._create_vehicle(public_request, customer)
        if public_request.request_type == PublicRequest.RequestType.BOOKING:
            reservation = self._create_reservation(public_request, customer, vehicle, request)
            public_request.mark_converted(reservation=reservation)
            return {
                "created_type": "reservation",
                "public_request": PublicRequestSerializer(public_request, context={"request": request}).data,
                "reservation": ReservationSerializer(reservation, context={"request": request}).data,
            }
        quote = self._create_quote(public_request, customer, vehicle)
        public_request.mark_converted(quote=quote)
        return {
            "created_type": "quote",
            "public_request": PublicRequestSerializer(public_request, context={"request": request}).data,
            "quote": QuoteSerializer(quote, context={"request": request}).data,
        }

    def _create_customer(self, public_request):
        return Customer.objects.create(
            business=public_request.business,
            name=public_request.customer_name,
            phone=public_request.customer_phone,
            email=public_request.customer_email,
            notes="Creado desde solicitud publica.",
        )

    def _create_vehicle(self, public_request, customer):
        return Vehicle.objects.create(
            business=public_request.business,
            customer=customer,
            license_plate=public_request.vehicle_license_plate,
            brand=public_request.vehicle_brand,
            model=public_request.vehicle_model,
            color=public_request.vehicle_color,
            vehicle_type=public_request.vehicle_type,
        )

    def _request_items_payload(self, public_request, vehicle=None):
        vehicle_type = getattr(vehicle, "vehicle_type", "")
        return [
            {
                "service": item.service_id,
                "description": item.description,
                "quantity": str(item.quantity),
                "unit_price": str(item.service.price_for(vehicle_type)),
            }
            for item in public_request.items.select_related("service")
            if item.service_id
        ]

    def _create_reservation(self, public_request, customer, vehicle, request):
        serializer = ReservationSerializer(
            data={
                "customer": customer.id,
                "vehicle": vehicle.id,
                "day": public_request.preferred_day,
                "start_time": public_request.preferred_time,
                "notes": public_request.message,
                "items": self._request_items_payload(public_request, vehicle),
            },
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        return serializer.save(business=public_request.business)

    def _create_quote(self, public_request, customer, vehicle):
        quote = Quote.objects.create(
            business=public_request.business,
            customer=customer,
            vehicle=vehicle,
            reservation_day=public_request.preferred_day,
            reservation_start_time=public_request.preferred_time,
            observations=public_request.message,
        )
        for item in public_request.items.select_related("service"):
            if not item.service_id:
                continue
            QuoteItem.objects.create(
                quote=quote,
                service=item.service,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.service.price_for(getattr(vehicle, "vehicle_type", "")),
            )
        quote.recalculate()
        return quote
