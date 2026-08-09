from django.contrib import admin

from .models import Institution, Unit, UserProfile


@admin.register(Institution)
class InstitutionAdmin(admin.ModelAdmin):
    list_display = ("name", "is_demo")


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ("name", "institution", "code", "is_demo")
    list_filter = ("institution", "is_demo")


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role", "institution", "unit")
    list_filter = ("role", "institution")

