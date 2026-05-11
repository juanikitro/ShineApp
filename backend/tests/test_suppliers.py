from datetime import date
from decimal import Decimal

import pytest
from django.urls import reverse

from debts.models import Debt
from finance.models import CashMovement
from inventory.models import Material, StockMovement, Supplier


@pytest.mark.django_db
def test_supplier_minimal_create_keeps_compatibility_and_list_insights(api_client):
    material = Material.objects.create(name="Shampoo", unit="litro")

    created = api_client.post(
        reverse("supplier-list"),
        {"name": "Distribuidora Norte"},
        format="json",
    )

    assert created.status_code == 201, created.data
    assert created.data["name"] == "Distribuidora Norte"
    assert created.data["legal_name"] == ""
    assert created.data["category"] == ""
    assert created.data["tax_condition"] == ""
    assert created.data["website"] == ""
    assert created.data["is_active"] is True

    purchase = api_client.post(
        reverse("stockmovement-list"),
        {
            "movement_type": StockMovement.MovementType.PURCHASE,
            "occurred_on": "2026-05-09",
            "supplier": created.data["id"],
            "affects_cash": True,
            "products_received": False,
            "lines": [
                {"material": material.id, "quantity": "2.00", "unit_price": "1000.00"},
            ],
        },
        format="json",
    )
    assert purchase.status_code == 201, purchase.data

    response = api_client.get(reverse("supplier-list"))

    assert response.status_code == 200
    supplier = next(item for item in response.data["results"] if item["id"] == created.data["id"])
    assert supplier["list_insights"]["purchase_count"] == 1
    assert Decimal(supplier["list_insights"]["total_purchased"]) == Decimal("2000.00")
    assert supplier["list_insights"]["last_purchase_on"] == date(2026, 5, 9)
    assert supplier["list_insights"]["pending_reception_count"] == 1
    assert supplier["list_insights"]["materials_count"] == 1
    assert supplier["list_insights"]["has_pending_reception"] is True


@pytest.mark.django_db
def test_supplier_history_summarizes_purchases_cash_documents_and_linked_debts(api_client):
    supplier = Supplier.objects.create(
        name="Juani Insumos",
        legal_name="Juani Insumos SRL",
        category="Insumos",
        tax_condition="Responsable inscripto",
        website="https://proveedor.example",
        contact_name="Juani",
        phone="1122334455",
        email="compras@example.com",
        tax_id="30-12345678-9",
        address="Av. Siempre Viva 123",
        notes="Entrega los martes",
    )
    shampoo = Material.objects.create(name="Shampoo", unit="litro")
    wax = Material.objects.create(name="Cera", unit="unidad")

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
                {"material": wax.id, "quantity": "1.00", "unit_price": "500.00"},
            ],
        },
        format="json",
    )
    assert pending.status_code == 201, pending.data

    received = api_client.post(
        reverse("stockmovement-list"),
        {
            "movement_type": StockMovement.MovementType.PURCHASE,
            "occurred_on": "2026-05-10",
            "supplier": supplier.id,
            "document_type": StockMovement.DocumentType.TICKET,
            "document_number": "T-100",
            "affects_cash": False,
            "products_received": True,
            "lines": [
                {"material": shampoo.id, "quantity": "1.00", "unit_price": "1200.00"},
            ],
        },
        format="json",
    )
    assert received.status_code == 201, received.data

    debt = api_client.post(
        reverse("debt-list"),
        {
            "concept": "Saldo factura 0001",
            "creditor": supplier.name,
            "supplier": supplier.id,
            "principal_amount": "900.00",
            "origin_date": "2026-05-09",
            "expense_category": "Proveedores",
            "expense_subcategory": "Materiales",
        },
        format="json",
    )
    assert debt.status_code == 201, debt.data
    assert debt.data["supplier"] == supplier.id
    assert debt.data["supplier_name"] == supplier.name

    Debt.objects.create(
        concept="Legacy sin proveedor real",
        creditor=supplier.name,
        principal_amount=Decimal("500.00"),
    )

    response = api_client.get(reverse("supplier-history", args=[supplier.id]))

    assert response.status_code == 200, response.data
    assert response.data["supplier"]["legal_name"] == "Juani Insumos SRL"
    assert response.data["summary"]["purchase_count"] == 2
    assert Decimal(response.data["summary"]["total_purchased"]) == Decimal("3700.00")
    assert response.data["summary"]["last_purchase_on"] == date(2026, 5, 10)
    assert response.data["summary"]["pending_reception_count"] == 1
    assert response.data["summary"]["materials_count"] == 2
    assert Decimal(response.data["summary"]["cash_expense_total"]) == Decimal("2500.00")
    assert Decimal(response.data["summary"]["debt_balance_due_total"]) == Decimal("900.00")

    assert [item["id"] for item in response.data["pending_receipts"]] == [pending.data["id"]]
    assert [item["id"] for item in response.data["debts"]] == [debt.data["id"]]
    assert response.data["cash_movements"][0]["stock_movement"] == pending.data["id"]
    assert response.data["documents"][0]["document_number"] == "T-100"
    assert response.data["documents"][1]["document_number"] == "0001-00000001"

    shampoo_row = next(item for item in response.data["materials"] if item["material"] == shampoo.id)
    assert shampoo_row["material_name"] == "Shampoo"
    assert shampoo_row["purchase_count"] == 2
    assert Decimal(shampoo_row["total_quantity"]) == Decimal("3.00")
    assert Decimal(shampoo_row["total_purchased"]) == Decimal("3200.00")
    assert Decimal(shampoo_row["last_unit_price"]) == Decimal("1200.00")
    assert [Decimal(item["unit_price"]) for item in shampoo_row["recent_unit_prices"]] == [
        Decimal("1200.00"),
        Decimal("1000.00"),
    ]
