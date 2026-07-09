from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from core.models import BusinessProfile, VehicleType
from core.serializers import BusinessScopedSerializerMixin
from customers.models import Vehicle
from scheduling.serializers import ReservationSerializer

from .models import Quote, QuoteItem, QuoteVehicleLine, QuoteVehicleLineItem


MAX_GROUP_VEHICLE_LINES = 25


class QuoteItemSerializer(BusinessScopedSerializerMixin, serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name", read_only=True)
    service_icon = serializers.CharField(source="service.icon", read_only=True)
    service_notes = serializers.CharField(source="service.notes", read_only=True)

    class Meta:
        model = QuoteItem
        fields = [
            "id",
            "service",
            "service_name",
            "service_icon",
            "service_notes",
            "description",
            "quantity",
            "unit_price",
            "line_total",
        ]
        read_only_fields = ["id", "service_name", "service_icon", "service_notes", "line_total"]
        extra_kwargs = {
            "description": {"required": False, "allow_blank": True},
            "unit_price": {"required": False},
        }

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("La cantidad debe ser mayor a cero.")
        return value

    def validate_unit_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("El precio no puede ser negativo.")
        return value


class QuoteVehicleLineItemSerializer(QuoteItemSerializer):
    class Meta(QuoteItemSerializer.Meta):
        model = QuoteVehicleLineItem


class InlineVehicleSerializer(serializers.Serializer):
    license_plate = serializers.CharField(required=False, allow_blank=True, max_length=20)
    brand = serializers.CharField(required=False, allow_blank=True, max_length=80)
    model = serializers.CharField(required=False, allow_blank=True, max_length=80)
    color = serializers.CharField(required=False, allow_blank=True, max_length=60)
    vehicle_type = serializers.ChoiceField(choices=VehicleType.choices)
    notes = serializers.CharField(required=False, allow_blank=True)


class QuoteVehicleLineSerializer(BusinessScopedSerializerMixin, serializers.ModelSerializer):
    vehicle_label = serializers.SerializerMethodField()
    reservation = serializers.PrimaryKeyRelatedField(read_only=True)
    new_vehicle = InlineVehicleSerializer(write_only=True, required=False)
    items = QuoteVehicleLineItemSerializer(many=True)

    class Meta:
        model = QuoteVehicleLine
        fields = [
            "id",
            "vehicle",
            "vehicle_label",
            "new_vehicle",
            "reservation",
            "reservation_day",
            "reservation_exit_day",
            "reservation_start_time",
            "reservation_exit_time",
            "notes",
            "vehicle_snapshot_label",
            "subtotal",
            "order",
            "items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "vehicle_label",
            "reservation",
            "vehicle_snapshot_label",
            "subtotal",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "vehicle": {"required": False},
            "order": {"required": False},
        }

    def get_vehicle_label(self, obj):
        return str(obj.vehicle) if obj.vehicle_id else obj.vehicle_snapshot_label

    def validate(self, attrs):
        vehicle = attrs.get("vehicle")
        new_vehicle = attrs.get("new_vehicle")
        if bool(vehicle) == bool(new_vehicle):
            raise serializers.ValidationError(
                "Indica un vehiculo existente o carga uno nuevo para esta linea."
            )
        items_data = attrs.get("items")
        if not items_data:
            raise serializers.ValidationError({"items": "Agrega al menos un servicio."})
        for item_data in items_data:
            service = item_data.get("service")
            if not service:
                raise serializers.ValidationError({"items": "Cada item debe indicar un servicio."})
            if not service.is_active:
                raise serializers.ValidationError("No se puede cotizar un servicio inactivo.")
            self.validate_same_business(service)
        return attrs


class QuoteSerializer(BusinessScopedSerializerMixin, serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    vehicle_label = serializers.SerializerMethodField()
    status_label = serializers.CharField(read_only=True)
    has_reservation = serializers.BooleanField(read_only=True)
    public_code = serializers.CharField(required=False, allow_blank=True, max_length=20)
    create_reservations = serializers.BooleanField(write_only=True, required=False, default=False)
    items = QuoteItemSerializer(many=True, required=False)
    vehicle_lines = QuoteVehicleLineSerializer(many=True, required=False)

    class Meta:
        model = Quote
        fields = [
            "id",
            "public_code",
            "customer",
            "customer_name",
            "vehicle",
            "vehicle_label",
            "is_group",
            "reservation",
            "reservation_day",
            "reservation_start_time",
            "quote_date",
            "valid_until",
            "status",
            "status_label",
            "sent_at",
            "has_reservation",
            "observations",
            "business_name",
            "business_address",
            "business_cuit",
            "business_vat_condition_label",
            "business_contact_phone",
            "business_contact_email",
            "customer_snapshot_name",
            "customer_snapshot_tax_id",
            "customer_snapshot_billing_address",
            "customer_snapshot_phone",
            "customer_snapshot_email",
            "vehicle_snapshot_label",
            "tax_rate",
            "discount_rate",
            "subtotal",
            "discount_amount",
            "taxable_amount",
            "tax_amount",
            "total",
            "terms",
            "payment_instructions",
            "create_reservations",
            "items",
            "vehicle_lines",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "customer_name",
            "vehicle_label",
            "reservation",
            "status_label",
            "sent_at",
            "has_reservation",
            "subtotal",
            "discount_amount",
            "taxable_amount",
            "tax_amount",
            "total",
            "created_at",
            "updated_at",
        ]

    def get_vehicle_label(self, obj):
        return str(obj.vehicle) if obj.vehicle else ""

    def validate_public_code(self, value):
        code = (value or "").strip()
        if not code:
            return ""
        duplicate = Quote.all_objects.filter(public_code=code)
        if self.instance is not None:
            duplicate = duplicate.exclude(pk=self.instance.pk)
        if duplicate.exists():
            raise serializers.ValidationError("Ya existe una cotización con ese código.")
        return code

    def validate(self, attrs):
        customer = attrs.get("customer") or getattr(self.instance, "customer", None)
        vehicle = attrs.get("vehicle") or getattr(self.instance, "vehicle", None)
        reservation = attrs.get("reservation") or getattr(self.instance, "reservation", None)
        items_data = attrs.get("items")
        vehicle_lines_data = attrs.get("vehicle_lines")
        is_group = attrs.get("is_group", getattr(self.instance, "is_group", False))
        if vehicle_lines_data is not None:
            is_group = True
            attrs["is_group"] = True
        create_reservations = bool(attrs.get("create_reservations", False))
        self.validate_same_business(customer, vehicle, reservation)

        if is_group:
            self._validate_group_payload(
                customer=customer,
                vehicle_lines_data=vehicle_lines_data,
                create_reservations=create_reservations,
            )
            if items_data:
                raise serializers.ValidationError(
                    {"items": "Las cotizaciones grupales usan vehicle_lines, no items."}
                )
            attrs["vehicle"] = None
        elif items_data:
            for item_data in items_data:
                self.validate_same_business(item_data.get("service"))
        if vehicle and customer and vehicle.customer_id != customer.id:
            raise serializers.ValidationError("El vehiculo seleccionado no pertenece al cliente.")
        return attrs

    def _validate_group_payload(self, *, customer, vehicle_lines_data, create_reservations):
        if not customer:
            raise serializers.ValidationError({"customer": "Este campo es requerido."})
        if vehicle_lines_data is None:
            return
        if not vehicle_lines_data:
            raise serializers.ValidationError({"vehicle_lines": "Agrega al menos un auto."})
        if len(vehicle_lines_data) > MAX_GROUP_VEHICLE_LINES:
            raise serializers.ValidationError(
                {"vehicle_lines": f"El maximo por cotizacion grupal es {MAX_GROUP_VEHICLE_LINES} autos."}
            )

        seen_vehicle_ids = set()
        seen_new_plates = set()
        dated_lines = 0
        for index, line_data in enumerate(vehicle_lines_data, start=1):
            vehicle = line_data.get("vehicle")
            new_vehicle = line_data.get("new_vehicle")
            if line_data.get("reservation_day"):
                dated_lines += 1
            if vehicle:
                if vehicle.customer_id != customer.id:
                    raise serializers.ValidationError(
                        {"vehicle_lines": f"El auto #{index} no pertenece al cliente seleccionado."}
                    )
                if vehicle.id in seen_vehicle_ids:
                    raise serializers.ValidationError(
                        {"vehicle_lines": f"El auto #{index} esta repetido en la cotizacion."}
                    )
                seen_vehicle_ids.add(vehicle.id)
                self.validate_same_business(vehicle)
            if new_vehicle:
                self._validate_new_vehicle_payload(index, new_vehicle, seen_new_plates)
            if create_reservations and not line_data.get("reservation_day"):
                raise serializers.ValidationError(
                    {"vehicle_lines": f"El auto #{index} necesita fecha para crear reservas."}
                )
        if 0 < dated_lines < len(vehicle_lines_data):
            raise serializers.ValidationError(
                {"vehicle_lines": "Todos los autos deben tener fecha o ninguno debe tenerla."}
            )

    def _validate_new_vehicle_payload(self, index, new_vehicle, seen_new_plates):
        vehicle_type = str(new_vehicle.get("vehicle_type") or "").strip()
        license_plate = str(new_vehicle.get("license_plate") or "").strip().upper()
        brand = str(new_vehicle.get("brand") or "").strip()
        model = str(new_vehicle.get("model") or "").strip()
        if not vehicle_type:
            raise serializers.ValidationError(
                {"vehicle_lines": f"El auto nuevo #{index} necesita tipo de vehiculo."}
            )
        if not license_plate and not (brand and model):
            raise serializers.ValidationError(
                {
                    "vehicle_lines": (
                        f"El auto nuevo #{index} necesita patente o marca y modelo."
                    )
                }
            )
        if license_plate:
            if license_plate in seen_new_plates:
                raise serializers.ValidationError(
                    {"vehicle_lines": f"La patente {license_plate} esta repetida."}
                )
            seen_new_plates.add(license_plate)
            business = self.get_business()
            duplicate = Vehicle.objects.filter(license_plate=license_plate)
            if business is not None:
                duplicate = duplicate.filter(business=business)
            if duplicate.exists():
                raise serializers.ValidationError(
                    {"vehicle_lines": f"Ya existe un vehiculo con patente {license_plate}."}
                )

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        vehicle_lines_data = validated_data.pop("vehicle_lines", [])
        create_reservations = validated_data.pop("create_reservations", False)
        if not validated_data.get("public_code"):
            validated_data.pop("public_code", None)
        quote = Quote(**self._with_quote_defaults(validated_data))
        quote._skip_snapshot_defaults = True
        quote.save()
        if quote.is_group:
            self._replace_vehicle_lines(quote, vehicle_lines_data)
            if create_reservations:
                self.create_group_reservations(quote)
        else:
            vehicle_type = getattr(quote.vehicle, "vehicle_type", "")
            for item_data in items_data:
                QuoteItem.objects.create(quote=quote, **self._with_service_defaults(item_data, vehicle_type))
        quote.recalculate()
        return quote

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        vehicle_lines_data = validated_data.pop("vehicle_lines", None)
        create_reservations = validated_data.pop("create_reservations", False)
        if "public_code" in validated_data and not validated_data["public_code"]:
            validated_data.pop("public_code")
        recalculation_fields = {"tax_rate", "discount_rate"}
        should_recalculate = (
            items_data is not None
            or vehicle_lines_data is not None
            or bool(recalculation_fields.intersection(validated_data))
        )
        if vehicle_lines_data is not None and instance.has_reservation:
            raise serializers.ValidationError(
                {"vehicle_lines": "No se pueden editar autos de una cotizacion grupal con reservas creadas."}
            )
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if instance.is_group and vehicle_lines_data is not None:
            self._replace_vehicle_lines(instance, vehicle_lines_data)
            instance.items.all().delete()
        elif items_data is not None:
            instance.items.all().delete()
            vehicle_type = getattr(instance.vehicle, "vehicle_type", "")
            for item_data in items_data:
                QuoteItem.objects.create(quote=instance, **self._with_service_defaults(item_data, vehicle_type))
        if create_reservations:
            self.create_group_reservations(instance)
        if should_recalculate:
            instance.recalculate()
        return instance

    def _replace_vehicle_lines(self, quote, vehicle_lines_data):
        quote.vehicle_lines.all().delete()
        for index, line_data in enumerate(vehicle_lines_data, start=1):
            items_data = line_data.pop("items", [])
            new_vehicle_data = line_data.pop("new_vehicle", None)
            vehicle = line_data.get("vehicle")
            if new_vehicle_data:
                vehicle = Vehicle.objects.create(
                    business=quote.business,
                    customer=quote.customer,
                    **new_vehicle_data,
                )
                line_data["vehicle"] = vehicle
            line_data.setdefault("order", index)
            line = QuoteVehicleLine.objects.create(
                quote=quote,
                **line_data,
            )
            vehicle_type = getattr(vehicle, "vehicle_type", "")
            for item_data in items_data:
                QuoteVehicleLineItem.objects.create(
                    vehicle_line=line,
                    **self._with_service_defaults(item_data, vehicle_type),
                )
            line.recalculate()

    def create_group_reservations(self, quote):
        if not quote.is_group:
            raise serializers.ValidationError({"is_group": "La cotizacion no es grupal."})
        created_any = False
        for line in quote.vehicle_lines.select_related("vehicle").prefetch_related("items", "items__service").all():
            if line.reservation_id:
                continue
            if not line.reservation_day:
                raise serializers.ValidationError(
                    {"vehicle_lines": "Todas las lineas necesitan fecha para crear reservas."}
                )
            serializer = ReservationSerializer(
                data={
                    "customer": quote.customer_id,
                    "vehicle": line.vehicle_id,
                    "day": line.reservation_day,
                    "exit_day": line.reservation_exit_day,
                    "start_time": line.reservation_start_time,
                    "exit_time": line.reservation_exit_time,
                    "notes": line.notes or quote.observations,
                    "items": [
                        {
                            "service": item.service_id,
                            "description": item.description,
                            "quantity": str(item.quantity),
                            "unit_price": str(item.unit_price),
                        }
                        for item in line.items.all()
                    ],
                },
                context=self.context,
            )
            serializer.is_valid(raise_exception=True)
            reservation = serializer.save(business=quote.business)
            line.reservation = reservation
            line.save(update_fields=["reservation", "updated_at"])
            created_any = True
        if created_any:
            first_line = quote.vehicle_lines.filter(reservation__isnull=False).order_by("order", "id").first()
            quote.reservation_day = first_line.reservation_day if first_line else quote.reservation_day
            quote.reservation_start_time = (
                first_line.reservation_start_time if first_line else quote.reservation_start_time
            )
            quote.save(update_fields=["reservation_day", "reservation_start_time", "updated_at"])
        return quote

    def _with_quote_defaults(self, validated_data):
        data = dict(validated_data)
        profile = BusinessProfile.get_solo(business=data.get("business") or self.get_business())
        quote_date = data.get("quote_date") or timezone.localdate()
        customer = data.get("customer")
        vehicle = data.get("vehicle")
        defaults = {
            "valid_until": quote_date + timedelta(days=profile.default_quote_validity_days),
            "business_name": profile.name,
            "business_address": profile.address,
            "business_cuit": profile.cuit,
            "business_vat_condition_label": profile.get_vat_condition_display() if profile.vat_condition else "",
            "business_contact_phone": profile.contact_phone,
            "business_contact_email": profile.contact_email,
            "tax_rate": profile.default_quote_tax_rate,
            "discount_rate": profile.default_quote_discount_rate,
            "terms": profile.default_quote_terms,
            "payment_instructions": profile.default_quote_payment_instructions,
        }
        if customer:
            defaults.update(
                {
                    "customer_snapshot_name": customer.name,
                    "customer_snapshot_tax_id": customer.tax_id,
                    "customer_snapshot_billing_address": customer.billing_address,
                    "customer_snapshot_phone": customer.phone,
                    "customer_snapshot_email": customer.email,
                }
            )
        if vehicle:
            defaults["vehicle_snapshot_label"] = str(vehicle)
        for field, value in defaults.items():
            if field not in data:
                data[field] = value
        return data

    def _with_service_defaults(self, item_data, vehicle_type=""):
        item_data = dict(item_data)
        service = item_data.get("service")
        if service:
            if not item_data.get("description"):
                item_data["description"] = service.name
            item_data.setdefault("unit_price", service.price_for(vehicle_type))
        return item_data
