from django.db import migrations, models


def populate_received_timestamps(apps, schema_editor):
    Submission = apps.get_model("submissions", "Submission")
    SubmissionVersion = apps.get_model("submissions", "SubmissionVersion")

    for version in SubmissionVersion.objects.filter(synced_at__isnull=False, received_at__isnull=True):
        SubmissionVersion.objects.filter(pk=version.pk).update(received_at=version.synced_at)

    for submission in Submission.objects.all():
        first_version = (
            SubmissionVersion.objects.filter(submission_id=submission.id)
            .order_by("created_at")
            .first()
        )
        latest_received = (
            SubmissionVersion.objects.filter(submission_id=submission.id, received_at__isnull=False)
            .order_by("-received_at")
            .first()
        )

        updates = {}
        if first_version and submission.closed_at is None:
            updates["closed_at"] = first_version.created_at
        if first_version and submission.submitted_at is None:
            updates["submitted_at"] = first_version.created_at
        if latest_received and submission.received_at is None:
            updates["received_at"] = latest_received.received_at

        if updates:
            Submission.objects.filter(pk=submission.pk).update(**updates)


class Migration(migrations.Migration):
    dependencies = [
        ("submissions", "0003_reportingperiod_dates_and_audit_expansion"),
    ]

    operations = [
        migrations.AddField(
            model_name="submission",
            name="collection_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="submission",
            name="closed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="submission",
            name="submitted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="submission",
            name="received_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="submissionversion",
            name="received_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(populate_received_timestamps, migrations.RunPython.noop),
    ]
