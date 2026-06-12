from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

from core.soft_delete import SoftDeleteMixin


class TaskPriority(models.TextChoices):
    HIGH = "high", "Alta"
    MEDIUM = "medium", "Media"
    LOW = "low", "Baja"


class TaskStatus(models.TextChoices):
    PENDING = "pending", "Pendiente"
    DONE = "done", "Completada"


class TaskRecurrence(models.TextChoices):
    NONE = "none", "Sin repeticion"
    DAILY = "daily", "Diaria"
    WEEKLY = "weekly", "Semanal"
    MONTHLY = "monthly", "Mensual"


def _advance_due_date(current, recurrence):
    if current is None or recurrence == TaskRecurrence.NONE:
        return None
    if recurrence == TaskRecurrence.DAILY:
        return current + timedelta(days=1)
    if recurrence == TaskRecurrence.WEEKLY:
        return current + timedelta(weeks=1)
    if recurrence == TaskRecurrence.MONTHLY:
        month = current.month + 1
        year = current.year + (1 if month > 12 else 0)
        month = ((month - 1) % 12) + 1
        day = current.day
        while True:
            try:
                return current.replace(year=year, month=month, day=day)
            except ValueError:
                day -= 1
                if day < 1:
                    return current
    return None


class Task(SoftDeleteMixin):
    business = models.ForeignKey(
        "core.BusinessAccount",
        related_name="tasks",
        on_delete=models.PROTECT,
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    priority = models.CharField(
        max_length=10,
        choices=TaskPriority.choices,
        default=TaskPriority.MEDIUM,
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="assigned_tasks",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="created_tasks",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    customer = models.ForeignKey(
        "customers.Customer",
        related_name="tasks",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    vehicle = models.ForeignKey(
        "customers.Vehicle",
        related_name="tasks",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    recurrence = models.CharField(
        max_length=10,
        choices=TaskRecurrence.choices,
        default=TaskRecurrence.NONE,
    )
    status = models.CharField(
        max_length=10,
        choices=TaskStatus.choices,
        default=TaskStatus.PENDING,
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="completed_tasks",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta(SoftDeleteMixin.Meta):
        ordering = ["-id"]

    def __str__(self):
        return self.title

    def mark_done(self, user):
        self.status = TaskStatus.DONE
        self.completed_at = timezone.now()
        self.completed_by = user if user and user.is_authenticated else None
        self.save(update_fields=["status", "completed_at", "completed_by", "updated_at"])
        return self.spawn_next_recurrence()

    def mark_pending(self):
        self.status = TaskStatus.PENDING
        self.completed_at = None
        self.completed_by = None
        self.save(update_fields=["status", "completed_at", "completed_by", "updated_at"])

    def spawn_next_recurrence(self):
        if self.recurrence == TaskRecurrence.NONE:
            return None
        if self.due_date is None:
            return None
        next_due = _advance_due_date(self.due_date, self.recurrence)
        if next_due is None:
            return None
        return Task.objects.create(
            business=self.business,
            title=self.title,
            description=self.description,
            due_date=next_due,
            priority=self.priority,
            assignee=self.assignee,
            created_by=self.created_by,
            customer=self.customer,
            vehicle=self.vehicle,
            recurrence=self.recurrence,
            status=TaskStatus.PENDING,
        )
