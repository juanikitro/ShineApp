from django import forms
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import Group

from .models import BusinessAccount, BusinessProfile, UserProfile
from .permissions import EMPLOYEE_ROLE, EMPLOYER_ROLE


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
    )


@admin.register(BusinessAccount)
class BusinessAccountAdmin(admin.ModelAdmin):
    form = BusinessAccountForm
    inlines = [BusinessProfileInline]
    list_display = ["name", "slug", "is_active", "users_count", "updated_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "slug", "user_profiles__user__username", "user_profiles__user__email"]
    readonly_fields = ["created_at", "updated_at"]
    actions = ["suspend_businesses", "reactivate_businesses"]

    def users_count(self, obj):
        return obj.user_profiles.count()

    users_count.short_description = "usuarios"

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
    list_display = ["name", "business", "subscription_type", "updated_at"]
    list_filter = ["subscription_type", "business__is_active"]
    search_fields = ["name", "business__name", "business__slug", "contact_email", "cuit"]
    autocomplete_fields = ["business"]


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
