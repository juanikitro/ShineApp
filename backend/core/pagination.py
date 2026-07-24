"""Paginacion estable para listados que se consumen completos desde el frontend."""

from rest_framework.pagination import PageNumberPagination


def stable_ordering_for(queryset):
    """Return the queryset ordering with its primary key as a final tie-breaker."""
    query = queryset.query
    ordering = list(query.order_by)
    if not ordering and query.default_ordering:
        ordering = list(queryset.model._meta.ordering or ())

    primary_key_name = queryset.model._meta.pk.name
    primary_key_aliases = {"pk", primary_key_name}
    has_primary_key = any(
        isinstance(term, str) and term.lstrip("-") in primary_key_aliases
        for term in ordering
    )
    if not has_primary_key:
        ordering.append(primary_key_name)
    return ordering


class StablePageNumberPagination(PageNumberPagination):
    """Make page boundaries deterministic when model ordering has duplicate values."""

    def paginate_queryset(self, queryset, request, view=None):
        if hasattr(queryset, "query") and hasattr(queryset, "order_by"):
            queryset = queryset.order_by(*stable_ordering_for(queryset))
        return super().paginate_queryset(queryset, request, view=view)
