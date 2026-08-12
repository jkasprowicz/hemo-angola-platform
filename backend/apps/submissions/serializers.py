from rest_framework import serializers

from .models import ReportingPeriod, Submission, SubmissionVersion


class SyncItemSerializer(serializers.Serializer):
    local_id = serializers.CharField()
    submission_uuid = serializers.UUIDField()
    version_uuid = serializers.UUIDField()
    version_number = serializers.IntegerField(min_value=1)
    institution_id = serializers.IntegerField()
    unit_id = serializers.IntegerField()
    reporting_period_id = serializers.IntegerField()
    collection_date = serializers.DateField()
    payload = serializers.JSONField()
    validation_summary = serializers.JSONField(required=False)
    audit_events = serializers.JSONField(required=False)
    closed_at = serializers.DateTimeField()
    submitted_at = serializers.DateTimeField(required=False, allow_null=True)

    def validate(self, attrs):
        period = ReportingPeriod.objects.get(pk=attrs["reporting_period_id"])
        collection_date = attrs["collection_date"]
        if collection_date < period.start_date or collection_date > period.end_date:
            raise serializers.ValidationError(
                {
                    "collection_date": (
                        f"A data da coleta deve pertencer ao período de referência {period.label}."
                    )
                }
            )
        return attrs


class SyncBatchSerializer(serializers.Serializer):
    items = SyncItemSerializer(many=True)


class SubmissionVersionSerializer(serializers.ModelSerializer):
    submission_uuid = serializers.UUIDField(source="submission.client_submission_uuid")
    reporting_period = serializers.CharField(source="submission.reporting_period.label")
    collection_date = serializers.DateField(source="submission.collection_date", allow_null=True)
    submitted_at = serializers.DateTimeField(source="submission.submitted_at", allow_null=True)
    received_at = serializers.DateTimeField(allow_null=True)

    class Meta:
        model = SubmissionVersion
        fields = (
            "id",
            "submission_uuid",
            "version_number",
            "status",
            "reporting_period",
            "collection_date",
            "created_at",
            "submitted_at",
            "received_at",
            "synced_at",
        )


class AuditEventSerializer(serializers.Serializer):
    id = serializers.UUIDField(source="public_id")
    timestamp = serializers.DateTimeField(source="created_at")
    user_id = serializers.IntegerField(source="actor_id", allow_null=True)
    user_name = serializers.CharField(source="actor_display_name")
    user_role = serializers.CharField(source="actor_role")
    action = serializers.CharField()
    entity_type = serializers.CharField()
    entity_id = serializers.CharField()
    unit_id = serializers.IntegerField(allow_null=True)
    reporting_period_id = serializers.IntegerField(allow_null=True)
    correlation_id = serializers.CharField()
    source = serializers.CharField()
    metadata = serializers.JSONField()
    before = serializers.JSONField()
    after = serializers.JSONField()


class SubmissionSerializer(serializers.ModelSerializer):
    versions = SubmissionVersionSerializer(many=True, read_only=True)

    class Meta:
        model = Submission
        fields = (
            "id",
            "public_id",
            "client_submission_uuid",
            "current_status",
            "created_at",
            "updated_at",
            "versions",
        )
