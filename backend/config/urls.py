from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from catalog.views import ServiceViewSet
from core.views import AuditLogView
from customers.views import CustomerViewSet, VehicleViewSet
from dashboard.views import DashboardSummaryView
from debts.views import DebtPaymentViewSet, DebtViewSet
from finance.views import CashCloseView, CashDailyView, CashMovementViewSet, PaymentViewSet
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
from scheduling.views import DailyAgendaView, DailyCapacityViewSet, ReservationViewSet
from workorders.views import WorkOrderViewSet
from notifications.views import (
    PublicLandingRequestCreateView,
    PublicLandingView,
    PublicRequestViewSet,
)

from .views import (
    BusinessProfileView,
    EmployeeUsersView,
    HealthCheckView,
    LoginView,
    LogoutView,
    MeView,
)

router = DefaultRouter()
router.register("customers", CustomerViewSet, basename="customer")
router.register("vehicles", VehicleViewSet, basename="vehicle")
router.register("services", ServiceViewSet, basename="service")
router.register("daily-capacities", DailyCapacityViewSet, basename="dailycapacity")
router.register("reservations", ReservationViewSet, basename="reservation")
router.register("work-orders", WorkOrderViewSet, basename="workorder")
router.register("payments", PaymentViewSet, basename="payment")
router.register("cash-movements", CashMovementViewSet, basename="cashmovement")
router.register("debts", DebtViewSet, basename="debt")
router.register("debt-payments", DebtPaymentViewSet, basename="debtpayment")
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
    path("api/auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("api/auth/me/", MeView.as_view(), name="auth-me"),
    path("api/auth/employees/", EmployeeUsersView.as_view(), name="auth-employees"),
    path("api/audit-log/", AuditLogView.as_view(), name="audit-log"),
    path(
        "api/settings/business-profile/",
        BusinessProfileView.as_view(),
        name="business-profile",
    ),
    path("api/agenda/daily/", DailyAgendaView.as_view(), name="agenda-daily"),
    path("api/cash/daily/", CashDailyView.as_view(), name="cash-daily"),
    path("api/cash/close/", CashCloseView.as_view(), name="cash-close"),
    path("api/dashboard/summary/", DashboardSummaryView.as_view(), name="dashboard-summary"),
    path("api/public/landing/<slug:slug>/", PublicLandingView.as_view(), name="public-landing"),
    path(
        "api/public/landing/<slug:slug>/requests/",
        PublicLandingRequestCreateView.as_view(),
        name="public-landing-requests",
    ),
    path("api/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
