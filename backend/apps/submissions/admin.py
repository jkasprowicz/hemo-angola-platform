from django.contrib import admin

from .models import AuditEvent, CollectionModule, CollectionVariable, IndicatorDefinition, ReportingPeriod, Submission, SubmissionVersion


@admin.register(ReportingPeriod)
class ReportingPeriodAdmin(admin.ModelAdmin):
    list_display = ("label", "unit", "status", "is_demo")
    list_filter = ("status", "is_demo")


@admin.register(CollectionModule)
class CollectionModuleAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "version", "display_order", "active", "is_demo")
    list_filter = ("active", "is_demo")
    search_fields = ("name", "code")


@admin.register(CollectionVariable)
class CollectionVariableAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "module", "variable_type", "required", "active", "version")
    list_filter = ("module", "variable_type", "required", "active", "is_demo")
    search_fields = ("name", "code")


@admin.register(IndicatorDefinition)
class IndicatorDefinitionAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "module", "dimension", "formula_kind", "version", "is_demo")
    list_filter = ("module", "dimension", "formula_kind", "is_demo")
    search_fields = ("name", "code")


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ("client_submission_uuid", "unit", "reporting_period", "current_status", "updated_at")
    list_filter = ("current_status", "unit")


@admin.register(SubmissionVersion)
class SubmissionVersionAdmin(admin.ModelAdmin):
    list_display = ("submission", "version_number", "status", "synced_at")
    list_filter = ("status",)


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    list_display = ("event_type", "actor", "submission", "submission_version", "created_at")
    list_filter = ("event_type",)
