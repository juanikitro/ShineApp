from django.db.models import Case, F, IntegerField, Value, When
from rest_framework import status as http_status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from core.audit import AuditedModelViewSetMixin, audit_snapshot, record_audit_event
from core.permissions import can_view_economy
from notifications.service import send_task_assignment_email

from .models import Task, TaskPriority, TaskStatus
from .serializers import TaskSerializer

PRIORITY_ORDER = Case(
    When(priority=TaskPriority.HIGH, then=Value(0)),
    When(priority=TaskPriority.MEDIUM, then=Value(1)),
    When(priority=TaskPriority.LOW, then=Value(2)),
    default=Value(3),
    output_field=IntegerField(),
)


class TaskViewSet(AuditedModelViewSetMixin, viewsets.ModelViewSet):
    queryset = Task.objects.select_related(
        "assignee",
        "created_by",
        "completed_by",
        "customer",
        "vehicle",
    ).all()
    serializer_class = TaskSerializer
    audit_module = "tasks"

    def _is_employer(self):
        return can_view_economy(self.request.user)

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        params = self.request.query_params

        if not self._is_employer():
            queryset = queryset.filter(assignee=user)
        else:
            assignee_param = params.get("assignee")
            if assignee_param == "unassigned":
                queryset = queryset.filter(assignee__isnull=True)
            elif assignee_param == "me":
                queryset = queryset.filter(assignee=user)
            elif assignee_param and assignee_param.isdigit():
                queryset = queryset.filter(assignee_id=int(assignee_param))

        status_param = params.get("status")
        if status_param in TaskStatus.values:
            queryset = queryset.filter(status=status_param)

        priority_param = params.get("priority")
        if priority_param in TaskPriority.values:
            queryset = queryset.filter(priority=priority_param)

        return queryset.order_by(
            PRIORITY_ORDER,
            F("due_date").asc(nulls_last=True),
            "-created_at",
        )

    def perform_create(self, serializer):
        business = self.get_business()
        save_kwargs = {"created_by": self.request.user}
        if business is not None:
            save_kwargs["business"] = business
        if not self._is_employer():
            save_kwargs["assignee"] = self.request.user

        instance = serializer.save(**save_kwargs)
        record_audit_event(
            request=self.request,
            action="create",
            instance=instance,
            before=None,
            after=audit_snapshot(instance),
            module=self.get_audit_module(instance),
        )
        self._notify_assignee_if_changed(instance, previous_assignee_id=None)

    def _ensure_can_modify(self, instance):
        if self._is_employer():
            return
        if instance.created_by_id != self.request.user.id:
            raise PermissionDenied("Solo podes editar las tareas que vos creaste.")

    def perform_update(self, serializer):
        instance = serializer.instance
        self._ensure_can_modify(instance)

        if not self._is_employer():
            serializer.validated_data.pop("assignee", None)

        before = audit_snapshot(instance)
        previous_assignee_id = instance.assignee_id
        updated = serializer.save()
        record_audit_event(
            request=self.request,
            action="update",
            instance=updated,
            before=before,
            after=audit_snapshot(updated),
            module=self.get_audit_module(updated),
        )
        self._notify_assignee_if_changed(updated, previous_assignee_id=previous_assignee_id)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self._ensure_can_modify(instance)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        task = self.get_object()
        if task.status == TaskStatus.DONE:
            return Response(self.get_serializer(task).data)
        before = audit_snapshot(task)
        spawned = task.mark_done(request.user)
        record_audit_event(
            request=request,
            action="complete",
            instance=task,
            before=before,
            after=audit_snapshot(task),
            module=self.get_audit_module(task),
        )
        if spawned is not None:
            record_audit_event(
                request=request,
                action="create",
                instance=spawned,
                before=None,
                after=audit_snapshot(spawned),
                module=self.get_audit_module(spawned),
            )
            self._notify_assignee_if_changed(spawned, previous_assignee_id=None)
        return Response(self.get_serializer(task).data)

    @action(detail=True, methods=["post"], url_path="reopen")
    def reopen(self, request, pk=None):
        task = self.get_object()
        if task.status == TaskStatus.PENDING:
            return Response(self.get_serializer(task).data)
        before = audit_snapshot(task)
        task.mark_pending()
        record_audit_event(
            request=request,
            action="reopen",
            instance=task,
            before=before,
            after=audit_snapshot(task),
            module=self.get_audit_module(task),
        )
        return Response(self.get_serializer(task).data)

    @action(detail=True, methods=["post"], url_path="restore")
    def restore(self, request, pk=None):
        task = Task.all_objects.filter(pk=pk).first()
        if task is None:
            return Response(status=http_status.HTTP_404_NOT_FOUND)
        business = self.get_business()
        if business is not None and task.business_id != business.id:
            return Response(status=http_status.HTTP_404_NOT_FOUND)
        self._ensure_can_modify(task)
        if task.deleted_at is None:
            return Response(self.get_serializer(task).data)
        before = audit_snapshot(task)
        task.restore()
        record_audit_event(
            request=request,
            action="restore",
            instance=task,
            before=before,
            after=audit_snapshot(task),
            module=self.get_audit_module(task),
        )
        return Response(self.get_serializer(task).data)

    def _notify_assignee_if_changed(self, task, previous_assignee_id):
        new_assignee = task.assignee
        if new_assignee is None:
            return
        if new_assignee.id == previous_assignee_id:
            return
        if new_assignee.id == getattr(self.request.user, "id", None):
            return
        send_task_assignment_email(task, new_assignee)
