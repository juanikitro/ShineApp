from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from catalog.views import SectorViewSet, ServiceMaterialViewSet, ServiceViewSet
from search.views import GlobalSearchView

from core.views import AuditLogView, TrashPurgeView, TrashRestoreView, TrashView
from customers.views import CustomerViewSet, VehicleViewSet
from dashboard.views import DashboardSummaryView
from debts.views import DebtPaymentViewSet, DebtViewSet
from finance.views import CashCloseView, CashDailyView, CashMovementViewSet, CashReopenView, PaymentViewSet
from fixed_expenses.views import FixedExpenseOccurrenceViewSet, FixedExpenseViewSet
from inventory.views import (
    MaterialConsumptionViewSet,
    MaterialOpenUnitViewSet,
    MaterialPurchaseViewSet,
    MaterialViewSet,
    StockMovementViewSet,
    SupplierViewSet,
    ToolViewSet,
)
from quotes.views import QuoteViewSet
from scheduling.views import DailyAgendaView, ReservationViewSet
from workorders.views import WorkOrderViewSet
from notifications.views import (
    PublicLandingAvailabilityView,
    PublicLandingRecallView,
    PublicLandingRequestCreateView,
    PublicLandingView,
    PublicRequestViewSet,
)

from .views import (
    BusinessProfileView,
    EmployeeUserDetailView,
    EmployeeUsersView,
    HealthCheckView,
    LoginView,
    LogoutView,
    MeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    TrialSignupView,
)

router = DefaultRouter()
router.register("customers", CustomerViewSet, basename="customer")
router.register("vehicles", VehicleViewSet, basename="vehicle")
router.register("services", ServiceViewSet, basename="service")
router.register("service-materials", ServiceMaterialViewSet, basename="servicematerial")
router.register("sectors", SectorViewSet, basename="sector")
router.register("reservations", ReservationViewSet, basename="reservation")
router.register("work-orders", WorkOrderViewSet, basename="workorder")
router.register("payments", PaymentViewSet, basename="payment")
router.register("cash-movements", CashMovementViewSet, basename="cashmovement")
router.register("debts", DebtViewSet, basename="debt")
router.register("debt-payments", DebtPaymentViewSet, basename="debtpayment")
router.register("fixed-expenses", FixedExpenseViewSet, basename="fixedexpense")
router.register("fixed-expense-occurrences", FixedExpenseOccurrenceViewSet, basename="fixedexpenseoccurrence")
router.register("materials", MaterialViewSet, basename="material")
router.register("suppliers", SupplierViewSet, basename="supplier")
router.register("stock-movements", StockMovementViewSet, basename="stockmovement")
router.register("tools", ToolViewSet, basename="tool")
router.register("material-open-units", MaterialOpenUnitViewSet, basename="materialopenunit")
router.register("material-purchases", MaterialPurchaseViewSet, basename="materialpurchase")
router.register("material-consumptions", MaterialConsumptionViewSet, basename="materialconsumption")
router.register("quotes", QuoteViewSet, basename="quote")
router.register("public-requests", PublicRequestViewSet, basename="publicrequest")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", HealthCheckView.as_view(), name="health-check"),
    path("api/auth/login/", LoginView.as_view(), name="auth-login"),
    path("api/auth/trial-signup/", TrialSignupView.as_view(), name="auth-trial-signup"),
    path("api/auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("api/auth/me/", MeView.as_view(), name="auth-me"),
    path("api/auth/employees/", EmployeeUsersView.as_view(), name="auth-employees"),
    path("api/auth/employees/<int:pk>/", EmployeeUserDetailView.as_view(), name="auth-employee-detail"),
    path("api/auth/password-reset/", PasswordResetRequestView.as_view(), name="auth-password-reset"),
    path("api/auth/password-reset/confirm/", PasswordResetConfirmView.as_view(), name="auth-password-reset-confirm"),
    path("api/audit-log/", AuditLogView.as_view(), name="audit-log"),
    path("api/trash/", TrashView.as_view(), name="trash-list"),
    path(
        "api/trash/<slug:entry_key>/<int:pk>/restore/",
        TrashRestoreView.as_view(),
        name="trash-restore",
    ),
    path(
        "api/trash/<slug:entry_key>/<int:pk>/",
        TrashPurgeView.as_view(),
        name="trash-purge",
    ),
    path(
        "api/settings/business-profile/",
        BusinessProfileView.as_view(),
        name="business-profile",
    ),
    path("api/agenda/daily/", DailyAgendaView.as_view(), name="agenda-daily"),
    path("api/cash/daily/", CashDailyView.as_view(), name="cash-daily"),
    path("api/cash/close/", CashCloseView.as_view(), name="cash-close"),
    path("api/cash/reopen/", CashReopenView.as_view(), name="cash-reopen"),
    path("api/dashboard/summary/", DashboardSummaryView.as_view(), name="dashboard-summary"),
    path("api/search/", GlobalSearchView.as_view(), name="global-search"),
    path("api/public/landing/<slug:slug>/", PublicLandingView.as_view(), name="public-landing"),
    path(
        "api/public/landing/<slug:slug>/requests/",
        PublicLandingRequestCreateView.as_view(),
        name="public-landing-requests",
    ),
    path(
        "api/public/landing/<slug:slug>/recall/",
        PublicLandingRecallView.as_view(),
        name="public-landing-recall",
    ),
    path(
        "api/public/landing/<slug:slug>/availability/",
        PublicLandingAvailabilityView.as_view(),
        name="public-landing-availability",
    ),
    path("api/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
