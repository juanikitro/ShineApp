from django.db.models.functions import Coalesce


def reservation_operational_deadline(reservation):
    return (
        getattr(reservation, "operational_deadline", None)
        or reservation.exit_day
        or reservation.day
    )


def reservation_operational_deadline_expression():
    return Coalesce("exit_day", "day")
