import uuid
from calendar import monthrange

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import Institution, Unit


class ReportingPeriod(models.Model):
    STATUS_OPEN = "open"
    STATUS_CLOSED = "closed"

    STATUS_CHOICES = [
        (STATUS_OPEN, "Aberto"),
        (STATUS_CLOSED, "Fechado"),
    ]

    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="reporting_periods")
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name="reporting_periods")
    label = models.CharField(max_length=100)
    reference_year = models.PositiveIntegerField()
    reference_month = models.PositiveIntegerField()
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_OPEN)
    is_demo = models.BooleanField(default=False)

    class Meta:
        unique_together = ("unit", "reference_year", "reference_month")
        ordering = ("-reference_year", "-reference_month")

    def __str__(self) -> str:
        return self.label

    def save(self, *args, **kwargs):
        if not self.label:
            self.label = f"{self.reference_month:02d}/{self.reference_year}"
        if not self.start_date or not self.end_date:
            last_day = monthrange(self.reference_year, self.reference_month)[1]
            self.start_date = self.start_date or timezone.datetime(self.reference_year, self.reference_month, 1).date()
            self.end_date = self.end_date or timezone.datetime(self.reference_year, self.reference_month, last_day).date()
        super().save(*args, **kwargs)


class CollectionModule(models.Model):
    code = models.CharField(max_length=64)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    display_order = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)
    version = models.PositiveIntegerField(default=1)
    valid_from = models.DateField(null=True, blank=True)
    valid_to = models.DateField(null=True, blank=True)
    is_demo = models.BooleanField(default=False)

    class Meta:
        unique_together = ("code", "version")
        ordering = ("display_order", "name")

    def __str__(self) -> str:
        return f"{self.name} v{self.version}"


class CollectionVariable(models.Model):
    TYPE_INTEGER = "integer"
    TYPE_DECIMAL = "decimal"
    TYPE_TEXT = "text"
    TYPE_SELECT = "select"
    TYPE_BOOLEAN = "boolean"

    TYPE_CHOICES = [
        (TYPE_INTEGER, "Integer"),
        (TYPE_DECIMAL, "Decimal"),
        (TYPE_TEXT, "Text"),
        (TYPE_SELECT, "Select"),
        (TYPE_BOOLEAN, "Boolean"),
    ]

    code = models.CharField(max_length=64)
    name = models.CharField(max_length=255)
    operational_definition = models.TextField()
    module = models.ForeignKey(CollectionModule, on_delete=models.CASCADE, related_name="variables")
    variable_type = models.CharField(max_length=16, choices=TYPE_CHOICES)
    unit = models.CharField(max_length=64, blank=True)
    required = models.BooleanField(default=False)
    min_value = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    max_value = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    expected_source = models.CharField(max_length=255, blank=True)
    help_text = models.TextField(blank=True)
    display_order = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)
    version = models.PositiveIntegerField(default=1)
    select_options = models.JSONField(default=list, blank=True)
    is_demo = models.BooleanField(default=False)

    class Meta:
        unique_together = ("code", "version")
        ordering = ("module__display_order", "display_order", "name")

    def __str__(self) -> str:
        return f"{self.name} ({self.code})"


class IndicatorDefinition(models.Model):
    DIMENSION_STRUCTURE = "structure"
    DIMENSION_PROCESS = "process"
    DIMENSION_RESULT = "result"

    DIMENSION_CHOICES = [
        (DIMENSION_STRUCTURE, "Estrutura"),
        (DIMENSION_PROCESS, "Processo"),
        (DIMENSION_RESULT, "Resultado"),
    ]

    FORMULA_RATIO_PERCENTAGE = "ratio_percentage"
    FORMULA_SHARE_OF_SUM_PERCENTAGE = "share_of_sum_percentage"

    FORMULA_KIND_CHOICES = [
        (FORMULA_RATIO_PERCENTAGE, "Razão percentual"),
        (FORMULA_SHARE_OF_SUM_PERCENTAGE, "Participação percentual na soma"),
    ]

    code = models.CharField(max_length=64)
    name = models.CharField(max_length=255)
    definition = models.TextField()
    module = models.ForeignKey(CollectionModule, on_delete=models.CASCADE, related_name="indicators")
    dimension = models.CharField(max_length=16, choices=DIMENSION_CHOICES)
    unit = models.CharField(max_length=64, blank=True)
    formula_kind = models.CharField(max_length=32, choices=FORMULA_KIND_CHOICES)
    formula_label = models.CharField(max_length=255)
    numerator_variable = models.ForeignKey(
        CollectionVariable,
        on_delete=models.PROTECT,
        related_name="as_numerator_in",
    )
    denominator_variable = models.ForeignKey(
        CollectionVariable,
        on_delete=models.PROTECT,
        related_name="as_denominator_in",
    )
    version = models.PositiveIntegerField(default=1)
    valid_from = models.DateField(null=True, blank=True)
    valid_to = models.DateField(null=True, blank=True)
    interpretation = models.TextField(blank=True)
    is_demo = models.BooleanField(default=False)

    class Meta:
        unique_together = ("code", "version")
        ordering = ("module__display_order", "name")

    def __str__(self) -> str:
        return f"{self.name} v{self.version}"


class Submission(models.Model):
    STATUS_DRAFT = "draft"
    STATUS_SUBMITTED = "submitted"
    STATUS_SYNCED = "synced"
    STATUS_CONFLICT = "conflict"
    STATUS_RETURNED = "returned"
    STATUS_ACCEPTED = "accepted"
    STATUS_CONSOLIDATED = "consolidated"

    STATUS_CHOICES = [
        (STATUS_DRAFT, "Rascunho"),
        (STATUS_SUBMITTED, "Submetido"),
        (STATUS_SYNCED, "Sincronizado"),
        (STATUS_CONFLICT, "Conflito"),
        (STATUS_RETURNED, "Devolvido"),
        (STATUS_ACCEPTED, "Aceito"),
        (STATUS_CONSOLIDATED, "Consolidado"),
    ]

    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    institution = models.ForeignKey(Institution, on_delete=models.CASCADE, related_name="submissions")
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name="submissions")
    reporting_period = models.ForeignKey(ReportingPeriod, on_delete=models.CASCADE, related_name="submissions")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="submissions")
    current_status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    client_submission_uuid = models.UUIDField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-updated_at",)


class SubmissionVersion(models.Model):
    STATUS_QUEUED = "queued"
    STATUS_SYNCED = "synced"
    STATUS_ERROR = "error"
    STATUS_CONFLICT = "conflict"
    STATUS_RETURNED = "returned"
    STATUS_RECEIVED = "received"
    STATUS_ACCEPTED = "accepted"
    STATUS_CONSOLIDATED = "consolidated"

    STATUS_CHOICES = [
        (STATUS_QUEUED, "Aguardando sincronização"),
        (STATUS_SYNCED, "Sincronizado"),
        (STATUS_ERROR, "Erro de sincronização"),
        (STATUS_CONFLICT, "Conflito"),
        (STATUS_RETURNED, "Devolvido para correção"),
        (STATUS_RECEIVED, "Recebido"),
        (STATUS_ACCEPTED, "Aceito"),
        (STATUS_CONSOLIDATED, "Consolidado"),
    ]

    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name="versions")
    version_number = models.PositiveIntegerField()
    client_version_uuid = models.UUIDField(unique=True)
    payload = models.JSONField()
    validation_summary = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_QUEUED)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="submission_versions")
    created_at = models.DateTimeField(auto_now_add=True)
    synced_at = models.DateTimeField(null=True, blank=True)
    conflict_reason = models.TextField(blank=True)

    class Meta:
        unique_together = ("submission", "version_number")
        ordering = ("-created_at",)


class AuditEvent(models.Model):
    EVENT_LOGIN = "login"
    EVENT_LOGOUT = "logout"
    EVENT_DRAFT_SAVED = "draft_saved"
    EVENT_SUBMISSION_CLOSED = "submission_closed"
    EVENT_SYNC_STARTED = "sync_started"
    EVENT_SYNC_COMPLETED = "sync_completed"
    EVENT_SYNC_FAILED = "sync_failed"
    EVENT_CONFLICT_DETECTED = "conflict_detected"

    EVENT_CHOICES = [
        (EVENT_LOGIN, "login"),
        (EVENT_LOGOUT, "logout"),
        (EVENT_DRAFT_SAVED, "draft_saved"),
        (EVENT_SUBMISSION_CLOSED, "submission_closed"),
        (EVENT_SYNC_STARTED, "sync_started"),
        (EVENT_SYNC_COMPLETED, "sync_completed"),
        (EVENT_SYNC_FAILED, "sync_failed"),
        (EVENT_CONFLICT_DETECTED, "conflict_detected"),
    ]

    event_type = models.CharField(max_length=64, choices=EVENT_CHOICES)
    public_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    action = models.CharField(max_length=128, db_index=True)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    actor_username = models.CharField(max_length=150, blank=True)
    actor_display_name = models.CharField(max_length=255, blank=True)
    actor_role = models.CharField(max_length=32, blank=True)
    submission = models.ForeignKey(Submission, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_events")
    submission_version = models.ForeignKey(SubmissionVersion, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_events")
    entity_type = models.CharField(max_length=64, blank=True)
    entity_id = models.CharField(max_length=255, blank=True)
    unit = models.ForeignKey(Unit, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_events")
    reporting_period = models.ForeignKey(ReportingPeriod, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_events")
    correlation_id = models.CharField(max_length=128, blank=True, db_index=True)
    source = models.CharField(max_length=64, default="server")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    before = models.JSONField(default=dict, blank=True)
    after = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValueError("AuditEvent is append-only and cannot be updated.")
        if not self.action:
            self.action = self.event_type
        if self.actor and not self.actor_username:
            self.actor_username = self.actor.username
        if self.actor and not self.actor_display_name:
            self.actor_display_name = self.actor.get_full_name() or self.actor.username
        if self.actor and hasattr(self.actor, "profile") and not self.actor_role:
            self.actor_role = self.actor.profile.role
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("AuditEvent is append-only and cannot be deleted.")
