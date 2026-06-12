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

    def mark_pending(self):
        self.status = TaskStatus.PENDING
        self.completed_at = None
        self.completed_by = None
        self.save(update_fields=["status", "completed_at", "completed_by", "updated_at"])
