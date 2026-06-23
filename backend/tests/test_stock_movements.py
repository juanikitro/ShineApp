from datetime import date
from decimal import Decimal

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse

from catalog.models import Service
from customers.models import Customer, Vehicle
from finance.models import CashClosure, CashMovement
from inventory.models import Material, MaterialPurchase, StockMovement, Supplier
from workorders.models import WorkOrder


@pytest.fixture
def base_data(db):
    customer = Customer.objects.create(name="Juan Perez")
    vehicle = Vehicle.objects.create(
        customer=customer,
        license_plate="ab123cd",
        brand="Ford",
        model="Focus",
    )
    from catalog.sector_defaults import ensure_default_sectors
    from core.models import BusinessAccount
    lavadero = ensure_default_sectors(BusinessAccount.get_default())["lavadero"]
    service = Service.objects.create(
        name="Lavado premium",
        sector=lavadero,
        base_price=Decimal("15000.00"),
    )
    return customer, vehicle, service


@pytest.mark.django_db
def test_material_accepts_operational_product_fields(api_client):
    response = api_client.post(
        reverse("material-list"),
        {
            "name": "Shampoo neutro 5L",
            "unit": "litro",
            "category": "Shampoo",
            "sku": "SH-N-5L",
            "presentation": "Bidon 5L",
            "minimum_stock": "2.00",
            "stock_quantity": "0.00",
        },
        format="json",
    )

    assert response.status_code == 201, response.data
    assert response.data["category"] == "Shampoo"
    assert response.data["sku"] == "SH-N-5L"
    assert response.data["presentation"] == "Bidon 5L"
    assert Decimal(response.data["minimum_stock"]) == Decimal("2.00")


@pytest.mark.django_db
def test_material_list_batches_summary_metrics(api_client):
    for index in range(8):
        material = Material.objects.create(
            name=f"Material {index}",
            unit="litro",
            stock_quantity=Decimal("2.00"),
            estimated_unit_cost=Decimal("10.00"),
        )
        MaterialPurchase.objects.create(
            material=material,
            quantity=Decimal("2.00"),
            total_cost=Decimal("30.00"),
        )

    with CaptureQueriesContext(connection) as queries:
        response = api_client.get(reverse("material-list"))

    assert response.status_code == 200, response.data
    assert len(queries) <= 12
    first = response.data["results"][0]
    assert first["stock_value"] == "20.00"
    assert first["last_purchase_unit_cost"] == 15.0
    assert first["last_purchase_date"]


@pytest.mark.django_db
def test_stock_purchase_pending_and_received_control_stock_cash_and_document(api_client):
    supplier = Supplier.objects.create(name="Juani")
    shampoo = Material.objects.create(name="Shampoo", unit="litro", stock_quantity=Decimal("0.00"))
    wax = Material.objects.create(name="Cera", unit="unidad", stock_quantity=Decimal("1.00"))

    pending = api_client.post(
        reverse("stockmovement-list"),
        {
            "movement_type": StockMovement.MovementType.PURCHASE,
            "occurred_on": "2026-05-09",
            "supplier": supplier.id,
            "document_type": StockMovement.DocumentType.INVOICE_A,
            "document_number": "0001-00000001",
            "affects_cash": True,
            "products_received": False,
            "lines": [
                {"material": shampoo.id, "quantity": "2.00", "unit_price": "1000.00"},
                {"material": wax.id, "quantity": "3.00", "unit_price": "500.00"},
            ],
        },
        format="json",
    )

    assert pending.status_code == 201, pending.data
    shampoo.refresh_from_db()
    wax.refresh_from_db()
    assert shampoo.stock_quantity == Decimal("0.00")
    assert wax.stock_quantity == Decimal("1.00")
    assert Decimal(pending.data["total_amount"]) == Decimal("3500.00")
    assert CashMovement.objects.filter(stock_movement_id=pending.data["id"]).exists()

    receipt = SimpleUploadedFile("factura.pdf", b"%PDF-1.4\nfake", content_type="application/pdf")
    received = api_client.post(
        reverse("stockmovement-list"),
        {
            "movement_type": StockMovement.MovementType.PURCHASE,
            "occurred_on": "2026-05-10",
            "supplier": supplier.id,
            "document_type": StockMovement.DocumentType.INVOICE_A,
            "document_number": "0001-00000002",
            "affects_cash": False,
            "products_received": True,
            "document_file": receipt,
            "lines": f'[{{"material": {shampoo.id}, "quantity": "1.00", "unit_price": "1200.00"}}]',
        },
        format="multipart",
    )

    assert received.status_code == 201, received.data
    shampoo.refresh_from_db()
    assert shampoo.stock_quantity == Decimal("1.00")
    assert Decimal(shampoo.estimated_unit_cost) == Decimal("1200.00")
    assert received.data["document_file_url"]
    assert not CashMovement.objects.filter(stock_movement_id=received.data["id"]).exists()


@pytest.mark.django_db
def test_stock_sale_requires_customer_decrements_stock_and_creates_cash_income(api_client, base_data):
    customer, _vehicle, _service = base_data
    shampoo = Material.objects.create(
        name="Shampoo",
        unit="litro",
        stock_quantity=Decimal("5.00"),
        estimated_unit_cost=Decimal("800.00"),
    )

    missing_customer = api_client.post(
        reverse("stockmovement-list"),
        {
            "movement_type": StockMovement.MovementType.SALE,
            "occurred_on": "2026-05-09",
            "payment_method": "transfer",
            "lines": [{"material": shampoo.id, "quantity": "2.00", "unit_price": "1500.00"}],
        },
        format="json",
    )
    sale = api_client.post(
        reverse("stockmovement-list"),
        {
            "movement_type": StockMovement.MovementType.SALE,
            "occurred_on": "2026-05-09",
            "customer": customer.id,
            "payment_method": "transfer",
            "lines": [{"material": shampoo.id, "quantity": "2.00", "unit_price": "1500.00"}],
        },
        format="json",
    )

    assert missing_customer.status_code == 400
    assert "customer" in missing_customer.data
    assert sale.status_code == 201, sale.data
    shampoo.refresh_from_db()
    assert shampoo.stock_quantity == Decimal("3.00")
    movement = CashMovement.objects.get(stock_movement_id=sale.data["id"])
    assert movement.movement_type == CashMovement.MovementType.INCOME
    assert movement.category == "Venta"
    assert movement.amount == Decimal("3000.00")


@pytest.mark.django_db
def test_stock_consumption_uses_reservation_work_order_and_updates_material_cost(api_client, base_data):
    customer, vehicle, service = base_data
    reservation = api_client.post(
        reverse("reservation-list"),
        {
            "customer": customer.id,
            "vehicle": vehicle.id,
            "service": service.id,
            "day": "2026-05-09",
            "status": "confirmed",
        },
        format="json",
    )
    material = Material.objects.create(
        name="Shampoo",
        unit="litro",
        stock_quantity=Decimal("5.00"),
        estimated_unit_cost=Decimal("700.00"),
    )

    response = api_client.post(
        reverse("stockmovement-list"),
        {
            "movement_type": StockMovement.MovementType.CONSUMPTION,
            "occurred_on": "2026-05-09",
            "reservation": reservation.data["id"],
            "lines": [{"material": material.id, "quantity": "2.00", "unit_price": "0.00"}],
        },
        format="json",
    )

    assert response.status_code == 201, response.data
    material.refresh_from_db()
    order = WorkOrder.objects.get(reservation_id=reservation.data["id"])
    assert response.data["work_order"] == order.id
    assert material.stock_quantity == Decimal("3.00")
    assert order.material_cost == Decimal("1400.00")


@pytest.mark.django_db
def test_stock_movement_update_and_delete_recalculate_stock_and_cash(api_client):
    material = Material.objects.create(name="Shampoo", unit="litro", stock_quantity=Decimal("0.00"))
    created = api_client.post(
        reverse("stockmovement-list"),
        {
            "movement_type": StockMovement.MovementType.PURCHASE,
            "occurred_on": "2026-05-09",
            "affects_cash": True,
            "products_received": True,
            "lines": [{"material": material.id, "quantity": "2.00", "unit_price": "1000.00"}],
        },
        format="json",
    )
    assert created.status_code == 201, created.data

    updated = api_client.patch(
        reverse("stockmovement-detail", args=[created.data["id"]]),
        {
            "lines": [{"material": material.id, "quantity": "3.00", "unit_price": "1200.00"}],
        },
        format="json",
    )

    assert updated.status_code == 200, updated.data
    material.refresh_from_db()
    assert material.stock_quantity == Decimal("3.00")
    assert CashMovement.objects.get(stock_movement_id=created.data["id"]).amount == Decimal("3600.00")

    deleted = api_client.delete(reverse("stockmovement-detail", args=[created.data["id"]]))

    assert deleted.status_code == 204
    material.refresh_from_db()
    assert material.stock_quantity == Decimal("0.00")
    assert not CashMovement.objects.filter(stock_movement_id=created.data["id"]).exists()


@pytest.mark.django_db
def test_closed_cash_day_blocks_stock_movements_that_impact_cash(api_client, base_data):
    customer, _vehicle, _service = base_data
    closed_day = date(2026, 5, 9)
    CashClosure.objects.create(
        day=closed_day,
        total_income=Decimal("0.00"),
        total_expense=Decimal("0.00"),
        balance=Decimal("0.00"),
    )
    material = Material.objects.create(name="Shampoo", unit="litro", stock_quantity=Decimal("5.00"))

    purchase = api_client.post(
        reverse("stockmovement-list"),
        {
            "movement_type": StockMovement.MovementType.PURCHASE,
            "occurred_on": closed_day.isoformat(),
            "affects_cash": True,
            "products_received": True,
            "lines": [{"material": material.id, "quantity": "1.00", "unit_price": "1000.00"}],
        },
        format="json",
    )
    sale = api_client.post(
        reverse("stockmovement-list"),
        {
            "movement_type": StockMovement.MovementType.SALE,
            "occurred_on": closed_day.isoformat(),
            "customer": customer.id,
            "payment_method": "cash",
            "lines": [{"material": material.id, "quantity": "1.00", "unit_price": "1000.00"}],
        },
        format="json",
    )

    assert purchase.status_code == 400
    assert sale.status_code == 400
    assert "cerrad" in str(purchase.data).lower()
    assert "cerrad" in str(sale.data).lower()
