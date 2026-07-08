from decimal import Decimal

from core.audit import audit_snapshot, record_audit_event
from core.models import BusinessProfile

from .models import Payment
from .serializers import PaymentSerializer


AUTO_DELIVERY_PAYMENT_NOTE = "Cobro automatico al entregar"
ZERO = Decimal("0.00")


def maybe_auto_charge_on_delivery(order, previous_status, request=None):
    if not order or previous_status == "delivered" or order.status != "delivered":
        return None

    locked_order = (
        order.__class__.objects.select_for_update()
        .select_related("reservation", "business")
        .get(pk=order.pk)
    )
    if locked_order.status != "delivered":
        return None

    profile = BusinessProfile.get_solo(business=locked_order.business)
    if not profile.reservation_auto_charge_on_delivery:
        return None

    amount = locked_order.balance_due
    if amount <= ZERO:
        return None

    last_payment = (
        Payment.objects.filter(work_order=locked_order)
        .order_by("-paid_at", "-id")
        .first()
    )
    method = last_payment.method if last_payment else Payment.Method.CASH
    serializer = PaymentSerializer(
        data={
            "work_order": locked_order.id,
            "amount": str(amount),
            "payment_type": Payment.PaymentType.PAYMENT,
            "method": method,
            "notes": AUTO_DELIVERY_PAYMENT_NOTE,
        },
        context={"request": request},
    )
    serializer.is_valid(raise_exception=True)
    payment = serializer.save()
    record_audit_event(
        request=request,
        action="create",
        instance=payment,
        before=None,
        after=audit_snapshot(payment),
        metadata={
            "auto_charge_on_delivery": True,
            "reservation": locked_order.reservation_id,
            "work_order": locked_order.id,
        },
        business=locked_order.business,
    )
    return payment
