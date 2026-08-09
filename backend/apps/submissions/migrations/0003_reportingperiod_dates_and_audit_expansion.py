from calendar import monthrange
import uuid

from django.db import migrations, models
import django.db.models.deletion


def get_actor_display_name(actor):
    if actor is None:
        return ""

    first_name = getattr(actor, "first_name", "") or ""
    last_name = getattr(actor, "last_name", "") or ""
    username = getattr(actor, "username", "") or ""
    email = getattr(actor, "email", "") or ""

    full_name = f"{first_name} {last_name}".strip()
    return full_name or username or email or str(getattr(actor, "pk", ""))


def populate_reporting_period_dates(apps, schema_editor):
    ReportingPeriod = apps.get_model("submissions", "ReportingPeriod")
    for period in ReportingPeriod.objects.all():
        last_day = monthrange(period.reference_year, period.reference_month)[1]
        ReportingPeriod.objects.filter(pk=period.pk).update(
            start_date=f"{period.reference_year:04d}-{period.reference_month:02d}-01",
            end_date=f"{period.reference_year:04d}-{period.reference_month:02d}-{last_day:02d}",
        )


def populate_audit_fields(apps, schema_editor):
    AuditEvent = apps.get_model("submissions", "AuditEvent")
    for event in AuditEvent.objects.select_related("actor", "submission").all():
        actor = event.actor if event.actor_id else None
        submission = event.submission if event.submission_id else None
        values = {
            "public_id": event.public_id or uuid.uuid4(),
            "action": ((getattr(event, "event_type", "") or "legacy_event").upper()),
            "actor_username": getattr(actor, "username", "") or "",
            "actor_display_name": get_actor_display_name(actor),
            "actor_role": getattr(getattr(actor, "profile", None), "role", "") if actor is not None else "",
            "entity_type": "submission" if submission is not None else "",
            "entity_id": str(getattr(submission, "client_submission_uuid", "") or "") if submission is not None else "",
            "unit_id": getattr(submission, "unit_id", None) if submission is not None else None,
            "reporting_period_id": getattr(submission, "reporting_period_id", None) if submission is not None else None,
        }
        AuditEvent.objects.filter(pk=event.pk).update(**values)


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0001_initial"),
        ("submissions", "0002_collectionmodule_collectionvariable_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="reportingperiod",
            name="start_date",
            field=models.DateField(default="2026-08-01"),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="reportingperiod",
            name="end_date",
            field=models.DateField(default="2026-08-31"),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="auditevent",
            name="public_id",
            field=models.UUIDField(blank=True, editable=False, null=True),
        ),
        migrations.AddField(
            model_name="auditevent",
            name="action",
            field=models.CharField(db_index=True, default="LEGACY_EVENT", max_length=128),
        ),
        migrations.AddField(
            model_name="auditevent",
            name="actor_username",
            field=models.CharField(blank=True, default="", max_length=150),
        ),
        migrations.AddField(
            model_name="auditevent",
            name="actor_display_name",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="auditevent",
            name="actor_role",
            field=models.CharField(blank=True, default="", max_length=32),
        ),
        migrations.AddField(
            model_name="auditevent",
            name="entity_type",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
        migrations.AddField(
            model_name="auditevent",
            name="entity_id",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="auditevent",
            name="unit",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="audit_events", to="core.unit"),
        ),
        migrations.AddField(
            model_name="auditevent",
            name="reporting_period",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="audit_events", to="submissions.reportingperiod"),
        ),
        migrations.AddField(
            model_name="auditevent",
            name="correlation_id",
            field=models.CharField(blank=True, db_index=True, default="", max_length=128),
        ),
        migrations.AddField(
            model_name="auditevent",
            name="source",
            field=models.CharField(default="server", max_length=64),
        ),
        migrations.AddField(
            model_name="auditevent",
            name="ip_address",
            field=models.GenericIPAddressField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="auditevent",
            name="user_agent",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="auditevent",
            name="before",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="auditevent",
            name="after",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.RunPython(populate_reporting_period_dates, migrations.RunPython.noop),
        migrations.RunPython(populate_audit_fields, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="auditevent",
            name="public_id",
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
    ]
