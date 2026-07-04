from datetime import timedelta

from django import forms
from django.contrib import admin, messages
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group
from django.utils import timezone

from .models import AuditLog, BusinessAccount, BusinessProfile, PasswordResetToken, UserProfile
from .permissions import EMPLOYEE_ROLE, EMPLOYER_ROLE

admin.site.site_header = "ShineApp Backoffice"
admin.site.site_title = "ShineApp"
admin.site.index_title = "Panel de operaciones"

TRIAL_ENDING_SOON_DAYS = 3


def filter_trial_status(queryset, value, *, prefix=""):
    now = timezone.now()
    soon = now + timedelta(days=TRIAL_ENDING_SOON_DAYS)

    def field(name):
        return f"{prefix}{name}"

    if value == "active":
        return queryset.filter(
            **{
                field("subscription_type"): BusinessProfile.SubscriptionType.TRIAL,
                field("trial_ends_at__gt"): soon,
            }
        )
    if value == "ending_soon":
        return queryset.filter(
            **{
                field("subscription_type"): BusinessProfile.SubscriptionType.TRIAL,
                field("trial_ends_at__gt"): now,
                field("trial_ends_at__lte"): soon,
            }
        )
    if value == "expired":
        return queryset.filter(
            **{
                field("subscription_type"): BusinessProfile.SubscriptionType.TRIAL,
                field("trial_ends_at__lte"): now,
            }
        )
    if value == "missing_dates":
        return queryset.filter(
            **{
                field("subscription_type"): BusinessProfile.SubscriptionType.TRIAL,
                field("trial_ends_at__isnull"): True,
            }
        )
    if value == "premium":
        return queryset.filter(**{field("subscription_type"): BusinessProfile.SubscriptionType.PREMIUM})
    return queryset


class TrialStatusFilter(admin.SimpleListFilter):
    title = "estado de prueba"
    parameter_name = "trial_status"
    profile_prefix = ""

    def lookups(self, request, model_admin):
        return (
            ("active", "Trial activo"),
            ("ending_soon", "Trial por vencer"),
            ("expired", "Trial vencido"),
            ("missing_dates", "Trial sin fecha"),
            ("premium", "Premium"),
        )

    def queryset(self, request, queryset):
        return filter_trial_status(queryset, self.value(), prefix=self.profile_prefix)


class BusinessAccountTrialStatusFilter(TrialStatusFilter):
    profile_prefix = "profile__"


def trial_status_label(profile):
    if profile is None:
        return "Sin perfil"
    if profile.subscription_type == BusinessProfile.SubscriptionType.PREMIUM:
        return "Premium"
    if profile.trial_ends_at is None:
        return "Trial sin fecha"
    now = timezone.now()
    if profile.trial_ends_at <= now:
        return "Trial vencido"
    if profile.trial_ends_at <= now + timedelta(days=TRIAL_ENDING_SOON_DAYS):
        return "Trial por vencer"
    return "Trial activo"


def trial_days_left(profile):
    if profile is None or profile.trial_ends_at is None:
        return None
    remaining = profile.trial_ends_at - timezone.now()
    if remaining.total_seconds() <= 0:
        return 0
    return max(1, remaining.days + (1 if remaining.seconds or remaining.microseconds else 0))


def owner_email_for_business(business):
    profile = (
        business.user_profiles.filter(user__groups__name=EMPLOYER_ROLE)
        .select_related("user")
        .order_by("user_id")
        .first()
    )
    if profile is None:
        return ""
    return profile.user.email or profile.user.get_username()


class BusinessAccountForm(forms.ModelForm):
    initial_employer_username = forms.CharField(
        label="Usuario empleador inicial",
        required=False,
        help_text="Se usa solo al crear un negocio nuevo.",
    )
    initial_employer_email = forms.EmailField(
        label="Email empleador inicial",
        required=False,
    )
    initial_employer_password = forms.CharField(
        label="Clave inicial empleador",
        required=False,
        widget=forms.PasswordInput(render_value=True),
    )

    class Meta:
        model = BusinessAccount
        fields = [
            "name",
            "slug",
            "is_active",
            "deactivated_at",
            "deactivation_reason",
        ]

    def clean(self):
        cleaned_data = super().clean()
        if self.instance.pk:
            return cleaned_data

        username = (cleaned_data.get("initial_employer_username") or "").strip()
        password = cleaned_data.get("initial_employer_password") or ""
        if not username:
            self.add_error("initial_employer_username", "Carga el usuario empleador inicial.")
        if not password:
            self.add_error("initial_employer_password", "Carga la clave inicial del empleador.")
        if username and get_user_model().objects.filter(username__iexact=username).exists():
            self.add_error("initial_employer_username", "Ya existe un usuario con ese nombre.")
        return cleaned_data


class BusinessProfileInline(admin.StackedInline):
    model = BusinessProfile
    can_delete = False
    extra = 0
    max_num = 1
    fieldsets = (
        (
            "Identidad",
            {
                "fields": (
                    "name",
                    "logo",
                    "cuit",
                    "vat_condition",
                    "contact_phone",
                    "contact_email",
                    "address",
                )
            },
        ),
        (
            "Cotizaciones",
            {
                "fields": (
                    "default_quote_validity_days",
                    "default_quote_tax_rate",
                    "default_quote_discount_rate",
                    "default_quote_terms",
                    "default_quote_payment_instructions",
                )
            },
        ),
        (
            "Operacion",
            {
                "fields": (
                    "use_reservation_times",
                    "show_stay_days_in_agenda",
                    "income_category_tree",
                    "expense_category_tree",
                )
            },
        ),
        (
            "Plan y prueba",
            {
                "fields": (
                    "subscription_type",
                    "trial_started_at",
                    "trial_ends_at",
                )
            },
        ),
    )


@admin.register(BusinessAccount)
class BusinessAccountAdmin(admin.ModelAdmin):
    form = BusinessAccountForm
    inlines = [BusinessProfileInline]
    list_display = [
        "name",
        "slug",
        "is_active",
        "trial_status",
        "trial_days_remaining",
        "owner_email",
        "users_count",
        "updated_at",
    ]
    list_filter = ["is_active", BusinessAccountTrialStatusFilter]
    list_select_related = ["profile"]
    search_fields = ["name", "slug", "user_profiles__user__username", "user_profiles__user__email"]
    readonly_fields = ["created_at", "updated_at"]
    actions = ["suspend_businesses", "reactivate_businesses"]

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .prefetch_related("user_profiles__user", "user_profiles__user__groups")
        )

    def users_count(self, obj):
        return obj.user_profiles.count()

    users_count.short_description = "usuarios"

    def trial_status(self, obj):
        return trial_status_label(getattr(obj, "profile", None))

    trial_status.short_description = "estado trial"

    def trial_days_remaining(self, obj):
        days = trial_days_left(getattr(obj, "profile", None))
        return "" if days is None else days

    trial_days_remaining.short_description = "dias trial"
    trial_days_remaining.admin_order_field = "profile__trial_ends_at"

    def owner_email(self, obj):
        return owner_email_for_business(obj)

    owner_email.short_description = "owner"

    def save_model(self, request, obj, form, change):
        was_active = None
        if change and obj.pk:
            was_active = BusinessAccount.objects.filter(pk=obj.pk).values_list("is_active", flat=True).first()
        super().save_model(request, obj, form, change)
        BusinessProfile.objects.get_or_create(business=obj, defaults={"name": obj.name})

        if not change:
            self.create_initial_employer(obj, form.cleaned_data)
        elif was_active is True and not obj.is_active:
            obj.invalidate_user_tokens()

    def create_initial_employer(self, business, cleaned_data):
        username = (cleaned_data.get("initial_employer_username") or "").strip()
        password = cleaned_data.get("initial_employer_password") or ""
        if not username or not password:
            return
        employer_group, _ = Group.objects.get_or_create(name=EMPLOYER_ROLE)
        user = get_user_model().objects.create_user(
            username=username,
            email=(cleaned_data.get("initial_employer_email") or "").strip(),
            password=password,
        )
        user.is_staff = False
        user.is_superuser = False
        user.save(update_fields=["is_staff", "is_superuser"])
        user.groups.set([employer_group])
        UserProfile.objects.get_or_create(user=user, defaults={"business": business})

    @admin.action(description="Suspender negocios seleccionados")
    def suspend_businesses(self, request, queryset):
        for business in queryset:
            business.deactivate(reason="Suspendido desde Django admin")

    @admin.action(description="Reactivar negocios seleccionados")
    def reactivate_businesses(self, request, queryset):
        for business in queryset:
            business.reactivate()


@admin.register(BusinessProfile)
class BusinessProfileAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "business",
        "subscription_type",
        "trial_status",
        "trial_days_remaining",
        "owner_email",
        "business_active",
        "updated_at",
    ]
    list_filter = [TrialStatusFilter, "subscription_type", "business__is_active"]
    list_select_related = ["business"]
    search_fields = ["name", "business__name", "business__slug", "contact_email", "cuit"]
    autocomplete_fields = ["business"]
    actions = ["extend_trials_7_days", "suspend_expired_trial_businesses"]

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .prefetch_related("business__user_profiles__user", "business__user_profiles__user__groups")
        )

    def trial_status(self, obj):
        return trial_status_label(obj)

    trial_status.short_description = "estado trial"

    def trial_days_remaining(self, obj):
        days = trial_days_left(obj)
        return "" if days is None else days

    trial_days_remaining.short_description = "dias trial"
    trial_days_remaining.admin_order_field = "trial_ends_at"

    def owner_email(self, obj):
        return owner_email_for_business(obj.business)

    owner_email.short_description = "owner"

    def business_active(self, obj):
        return obj.business.is_active

    business_active.boolean = True
    business_active.short_description = "activo"

    @admin.action(description="Extender trials seleccionados 7 dias")
    def extend_trials_7_days(self, request, queryset):
        now = timezone.now()
        updated = 0
        for profile in queryset.filter(subscription_type=BusinessProfile.SubscriptionType.TRIAL):
            base_end = profile.trial_ends_at if profile.trial_ends_at and profile.trial_ends_at > now else now
            if profile.trial_started_at is None:
                profile.trial_started_at = now
            profile.trial_ends_at = base_end + timedelta(days=7)
            profile.save(update_fields=["trial_started_at", "trial_ends_at", "updated_at"])
            updated += 1
        self.message_user(request, f"Trials extendidos: {updated}.", level=messages.SUCCESS)

    @admin.action(description="Suspender negocios con trial vencido")
    def suspend_expired_trial_businesses(self, request, queryset):
        now = timezone.now()
        suspended = 0
        eligible = queryset.filter(
            subscription_type=BusinessProfile.SubscriptionType.TRIAL,
            trial_ends_at__lte=now,
            business__is_active=True,
        ).select_related("business")
        for profile in eligible:
            profile.business.deactivate(reason="Trial vencido desde Django admin")
            suspended += 1
        self.message_user(request, f"Negocios suspendidos por trial vencido: {suspended}.", level=messages.WARNING)


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    extra = 0
    max_num = 1
    autocomplete_fields = ["business"]
    fields = ["business", "avatar", "phone_country_code", "phone_number"]


class BusinessUserAdmin(UserAdmin):
    inlines = [UserProfileInline]
    list_display = [*UserAdmin.list_display, "business_name", "role_name"]
    list_filter = [*UserAdmin.list_filter, "profile__business", "groups"]
    search_fields = [*UserAdmin.search_fields, "profile__business__name", "profile__business__slug"]

    def business_name(self, obj):
        try:
            return obj.profile.business.name
        except UserProfile.DoesNotExist:
            return ""

    business_name.short_description = "negocio"

    def role_name(self, obj):
        if obj.groups.filter(name=EMPLOYER_ROLE).exists():
            return "empleador"
        if obj.groups.filter(name=EMPLOYEE_ROLE).exists():
            return "empleado"
        return ""

    role_name.short_description = "rol"

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        user = form.instance
        try:
            profile = user.profile
        except UserProfile.DoesNotExist:
            return
        if profile.business_id and not user.is_superuser:
            changed = []
            if user.is_staff:
                user.is_staff = False
                changed.append("is_staff")
            if user.is_superuser:
                user.is_superuser = False
                changed.append("is_superuser")
            if changed:
                user.save(update_fields=changed)


user_model = get_user_model()
admin.site.unregister(user_model)
admin.site.register(user_model, BusinessUserAdmin)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["created_at", "actor_username", "action", "module", "entity_type", "entity_id", "entity_label"]
    list_filter = ["action", "module", "created_at"]
    search_fields = ["actor_username", "actor_email", "entity_type", "entity_id", "entity_label", "request_path"]
    date_hierarchy = "created_at"
    list_per_page = 25
    ordering = ["-created_at", "-id"]
    readonly_fields = [
        "business", "actor", "actor_username", "actor_email", "actor_role",
        "action", "module", "entity_type", "entity_id", "entity_label",
        "before", "after", "changes", "metadata",
        "request_path", "request_method", "created_at",
    ]
    list_select_related = ["actor"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ["user", "expires_at", "used", "created_at"]
    list_filter = ["used", "created_at"]
    search_fields = ["user__username", "user__email"]
    list_per_page = 25
    ordering = ["-created_at"]
    readonly_fields = ["user", "expires_at", "used", "created_at"]
    list_select_related = ["user"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
