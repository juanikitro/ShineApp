from django.contrib import admin

from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "business",
        "assignee",
        "priority",
        "status",
        "due_date",
        "created_at",
    ]
    list_filter = ["business", "status", "priority", "due_date"]
    search_fields = ["title", "description", "assignee__username", "created_by__username"]
    readonly_fields = ["created_at", "updated_at", "completed_at"]
    autocomplete_fields = ["business", "assignee", "created_by", "completed_by"]
    list_select_related = ["business", "assignee", "created_by"]
    date_hierarchy = "created_at"
