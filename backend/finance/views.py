from datetime import date
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from rest_framework import mixins, response, serializers, status, viewsets
from rest_framework.views import APIView

from core.audit import AuditedModelViewSetMixin, audit_snapshot, record_audit_event
from core.models import (
    BusinessProfile,
    default_expense_category_tree,
    default_income_category_tree,
    normalize_expense_category_tree,
    normalize_income_category_tree,
)
from core.permissions import CanViewEconomy
from core.permissions import business_for_user, business_from_request
from debts.models import DebtPayment

from .cash import cash_day, decimal_total, ensure_cash_day_open, signed_amount_for, totals_payload
from .models import CashClosure, CashMovement, Payment
from .serializers import CashClosureSerializer, CashMovementSerializer, PaymentSerializer


def economic_totals_for_day(day, business):
    movements = CashMovement.objects.filter(business=business, occurred_at__date=day)
    income = decimal_total(movements.filter(movement_type=CashMovement.MovementType.INCOME))
    expense = decimal_total(movements.filter(movement_type=CashMovement.MovementType.EXPENSE))
    return totals_payload(income, expense)


def cash_totals_for_day(day, business):
    totals = economic_totals_for_day(day, business)
    return totals["income"], totals["expense"], totals["balance"]


def cashflow_totals_for_day(day, business):
    movements = CashMovement.objects.select_related("payment", "material_purchase", "stock_movement", "debt").filter(
        business=business,
        occurred_at__date=day,
    )
    cash_movements = [
        movement for movement in movements if CashMovementSerializer().get_cashflow_effect(movement)
    ]
    income = sum(
        (movement.amount for movement in cash_movements if movement.movement_type == CashMovement.MovementType.INCOME),
        Decimal("0.00"),
    )
    expense = sum(
        (movement.amount for movement in cash_movements if movement.movement_type == CashMovement.MovementType.EXPENSE),
        Decimal("0.00"),
    )
    debt_payments = DebtPayment.objects.filter(business=business, paid_at=day)
    expense += decimal_total(debt_payments)
    return totals_payload(income, expense)


def expense_category_tree_for_profile(business):
    tree = BusinessProfile.get_solo(business=business).expense_category_tree or default_expense_category_tree()
    return normalize_expense_category_tree(tree)


def income_category_tree_for_profile(business):
    tree = BusinessProfile.get_solo(business=business).income_category_tree or default_income_category_tree()
    return normalize_income_category_tree(tree)


def debt_payment_entry(payment):
    debt = payment.debt
    creditor = (debt.creditor or "").strip()
    counterparty_label = creditor or getattr(getattr(debt, "supplier", None), "name", "") or ""
    return {
        "id": f"debt-payment-{payment.id}",
        "source_id": payment.id,
        "source_kind": "debt_payment",
        "source_label": "Pago de deuda",
        "movement_type": CashMovement.MovementType.EXPENSE,
        "category": "Deudas",
        "subcategory": "Pago de deuda",
        "amount": payment.amount,
        "signed_amount": signed_amount_for(CashMovement.MovementType.EXPENSE, payment.amount),
        "occurred_at": payment.paid_at.isoformat(),
        "description": payment.notes or payment.debt.concept,
        "debt": payment.debt_id,
        "debt_concept": payment.debt.concept,
        "payment": None,
        "material_purchase": None,
        "stock_movement": None,
        "adjusts_closed_day": None,
        "cashflow_effect": True,
        "economic_effect": False,
        "counterparty_kind": "creditor",
        "counterparty_label": counterparty_label,
        "reference_label": payment.debt.concept,
        "payment_method": payment.get_method_display() if hasattr(payment, "get_method_display") else "",
        "created_by": None,
        "created_by_username": "",
        "created_at": payment.created_at,
    }


# select_related profundo que cubre todos los FKs que recorren los method-fields
# de CashMovementSerializer (counterparty/reference/payment_method/created_by).
CASH_MOVEMENT_SELECT_RELATED = (
    "payment__work_order__customer",
    "material_purchase__material",
    "stock_movement__supplier",
    "stock_movement__customer",
    "debt__supplier",
    "created_by",
)


def cash_entries_for_day(day, request=None, business=None):
    movements = CashMovement.objects.select_related(
        *CASH_MOVEMENT_SELECT_RELATED
    ).filter(business=business, occurred_at__date=day)
    movement_entries = CashMovementSerializer(movements, many=True, context={"request": request}).data
    debt_entries = [
        debt_payment_entry(payment)
        for payment in DebtPayment.objects.select_related("debt__supplier").filter(business=business, paid_at=day)
    ]
    return sorted(
        [*movement_entries, *debt_entries],
        key=lambda item: str(item.get("occurred_at") or ""),
        reverse=True,
    )


def sync_cash_closure_for_day(day, user=None, notes="Cierre automatico", business=None):
    if business is None and user is not None and user.is_authenticated:
        business = business_for_user(user)
    existing = CashClosure.objects.filter(business=business, day=day).first()
    if existing:
        return existing
    economic_totals = economic_totals_for_day(day, business)
    cashflow_totals = cashflow_totals_for_day(day, business)
    closure = CashClosure.objects.create(
        business=business,
        day=day,
        total_income=economic_totals["income"],
        total_expense=economic_totals["expense"],
        balance=economic_totals["balance"],
        cashflow_income=cashflow_totals["income"],
        cashflow_expense=cashflow_totals["expense"],
        cashflow_balance=cashflow_totals["balance"],
        closed_by=user,
        notes=notes,
    )
    return closure


def sync_past_cash_closures(reference_day=None, user=None, business=None):
    today = date.today()
    if reference_day is None:
        reference_day = today
    cutoff = min(reference_day, today)
    movement_days = CashMovement.objects.filter(business=business, occurred_at__date__lt=cutoff).dates("occurred_at", "day")
    debt_payment_days = DebtPayment.objects.filter(business=business, paid_at__lt=cutoff).dates("paid_at", "day")
    days = sorted(set(movement_days) | set(debt_payment_days))
    for day in days:
        sync_cash_closure_for_day(day, user=user, business=business)


class PaymentViewSet(
    AuditedModelViewSetMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    audit_side_effects = ("cash_movement",)
    queryset = Payment.objects.select_related("work_order", "work_order__customer").all()
    serializer_class = PaymentSerializer
    permission_classes = [CanViewEconomy]

    @transaction.atomic
    def perform_destroy(self, instance):
        ensure_cash_day_open(cash_day(instance.paid_at), field="paid_at", business=instance.business)
        instance.delete()


class CashMovementViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    audit_side_effects = ("category_suggestions",)
    queryset = CashMovement.objects.select_related(*CASH_MOVEMENT_SELECT_RELATED).all()
    serializer_class = CashMovementSerializer
    permission_classes = [CanViewEconomy]

    def perform_destroy(self, instance):
        ensure_cash_day_open(
            cash_day(instance.occurred_at),
            field="occurred_at",
            business=instance.business,
        )
        super().perform_destroy(instance)


class CashDailyView(APIView):
    permission_classes = [CanViewEconomy]

    def get(self, request):
        day = date.fromisoformat(request.query_params.get("date")) if request.query_params.get("date") else date.today()
        business = business_from_request(request)
        sync_past_cash_closures(reference_day=day, user=request.user if request.user.is_authenticated else None, business=business)
        economic_totals = economic_totals_for_day(day, business)
        cashflow_totals = cashflow_totals_for_day(day, business)
        expense_category_tree = expense_category_tree_for_profile(business)
        income = economic_totals["income"]
        expense = economic_totals["expense"]
        balance = economic_totals["balance"]
        movements = CashMovement.objects.select_related(*CASH_MOVEMENT_SELECT_RELATED).filter(
            business=business,
            occurred_at__date=day
        )
        closure = CashClosure.objects.filter(business=business, day=day).first()
        income_category_tree = income_category_tree_for_profile(business)
        return response.Response(
            {
                "date": day.isoformat(),
                "income": income,
                "expense": expense,
                "balance": balance,
                "is_closed": closure is not None,
                "closure": CashClosureSerializer(closure).data if closure else None,
                "movements": CashMovementSerializer(movements, many=True).data,
                "entries": cash_entries_for_day(day, request=request, business=business),
                "economic_totals": economic_totals,
                "cashflow_totals": cashflow_totals,
                "category_options": {
                    CashMovement.MovementType.INCOME: list(income_category_tree.keys()),
                    CashMovement.MovementType.EXPENSE: list(expense_category_tree.keys()),
                },
                "income_category_tree": income_category_tree,
                "expense_category_tree": expense_category_tree,
            }
        )


class CashCloseView(APIView):
    permission_classes = [CanViewEconomy]

    @transaction.atomic
    def post(self, request):
        day = date.fromisoformat(request.data.get("date")) if request.data.get("date") else date.today()
        business = business_from_request(request)
        if CashClosure.objects.filter(business=business, day=day).exists():
            raise serializers.ValidationError({"date": "La caja de este dia ya esta cerrada."})
        closure = sync_cash_closure_for_day(
            day,
            user=request.user if request.user.is_authenticated else None,
            notes=request.data.get("notes", "Cierre manual"),
            business=business,
        )
        record_audit_event(
            request=request,
            action="close",
            instance=closure,
            before=None,
            after=audit_snapshot(closure),
        )
        return response.Response(CashClosureSerializer(closure).data, status=status.HTTP_201_CREATED)


class CashReopenView(APIView):
    permission_classes = [CanViewEconomy]

    @transaction.atomic
    def post(self, request):
        day = date.fromisoformat(request.data.get("date")) if request.data.get("date") else date.today()
        business = business_from_request(request)
        # select_for_update evita que dos reaperturas concurrentes borren el
        # mismo cierre (el bloque ya corre dentro de @transaction.atomic).
        closure = CashClosure.objects.select_for_update().filter(business=business, day=day).first()
        if not closure:
            raise serializers.ValidationError({"date": "La caja de este dia no esta cerrada."})
        record_audit_event(
            request=request,
            action="reopen",
            instance=closure,
            before=audit_snapshot(closure),
            after=None,
        )
        closure.delete()
        return response.Response({"date": day.isoformat()}, status=status.HTTP_200_OK)
