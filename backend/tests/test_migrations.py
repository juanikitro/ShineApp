from importlib import import_module

BUSINESS_BACKFILL_MIGRATIONS = [
    "core.migrations.0010_businessaccount_multitenancy",
    "catalog.migrations.0003_service_business",
    "customers.migrations.0006_customer_vehicle_business",
    "debts.migrations.0004_debt_business",
    "finance.migrations.0005_finance_business",
    "inventory.migrations.0007_inventory_business",
    "quotes.migrations.0004_quote_business",
    "scheduling.migrations.0006_dailycapacity_reservation_business",
    "workorders.migrations.0003_workorder_business",
]


def test_business_backfill_migrations_are_non_atomic():
    for module_path in BUSINESS_BACKFILL_MIGRATIONS:
        migration = import_module(module_path).Migration

        assert migration.atomic is False, module_path
