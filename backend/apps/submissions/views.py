from django.db import transaction
from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import Institution, Unit

from .audit import audit_service
from .models import AuditEvent, ReportingPeriod, Submission, SubmissionVersion
from .serializers import AuditEventSerializer, SubmissionVersionSerializer, SyncBatchSerializer


class CanViewAuditLog(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return getattr(request.user.profile, "role", "") in {"admin", "manager"}


class SyncBatchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = SyncBatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        results = []

        for item in serializer.validated_data["items"]:
            correlation_id = str(item["submission_uuid"])
            audit_service.log(
                action="SUBMISSION_SYNC_STARTED",
                request=request,
                actor=request.user,
                entity_type="submission",
                entity_id=str(item["submission_uuid"]),
                correlation_id=correlation_id,
                metadata={"local_id": item["local_id"], "version_number": item["version_number"]},
            )

            institution = Institution.objects.get(pk=item["institution_id"])
            unit = Unit.objects.get(pk=item["unit_id"])
            period = ReportingPeriod.objects.get(pk=item["reporting_period_id"])

            submission, created = Submission.objects.get_or_create(
                client_submission_uuid=item["submission_uuid"],
                defaults={
                    "institution": institution,
                    "unit": unit,
                    "reporting_period": period,
                    "created_by": request.user,
                    "current_status": Submission.STATUS_SUBMITTED,
                },
            )
            if created:
                audit_service.log(
                    action="SUBMISSION_CREATED",
                    request=request,
                    actor=request.user,
                    submission=submission,
                    reporting_period=period,
                    unit=unit,
                    entity_type="submission",
                    entity_id=str(submission.client_submission_uuid),
                    correlation_id=correlation_id,
                    metadata={"local_id": item["local_id"]},
                )

            version = SubmissionVersion.objects.filter(
                submission=submission,
                version_number=item["version_number"],
            ).first()

            if version:
                results.append(
                    {
                        "localId": item["local_id"],
                        "submissionUuid": str(submission.client_submission_uuid),
                        "versionNumber": version.version_number,
                        "status": SubmissionVersion.STATUS_RECEIVED,
                        "syncedAt": version.synced_at.isoformat() if version.synced_at else None,
                        "idempotent": True,
                    }
                )
                continue

            version = SubmissionVersion.objects.create(
                submission=submission,
                version_number=item["version_number"],
                client_version_uuid=item["version_uuid"],
                payload=item["payload"],
                validation_summary=item.get("validation_summary", {}),
                status=SubmissionVersion.STATUS_RECEIVED,
                created_by=request.user,
                synced_at=timezone.now(),
            )
            submission.current_status = Submission.STATUS_SYNCED
            submission.save(update_fields=["current_status", "updated_at"])

            audit_service.log(
                action="SUBMISSION_SYNC_SUCCEEDED",
                request=request,
                actor=request.user,
                submission=submission,
                submission_version=version,
                reporting_period=period,
                unit=unit,
                entity_type="submission_version",
                entity_id=str(version.client_version_uuid),
                correlation_id=correlation_id,
                metadata={"local_id": item["local_id"]},
            )
            audit_service.log(
                action="SUBMISSION_RECEIVED",
                request=request,
                actor=request.user,
                submission=submission,
                submission_version=version,
                reporting_period=period,
                unit=unit,
                entity_type="submission_version",
                entity_id=str(version.client_version_uuid),
                correlation_id=correlation_id,
                metadata={"local_id": item["local_id"]},
            )
            for audit_event in item.get("audit_events", []):
                audit_service.log(
                    action=audit_event.get("action", "CLIENT_AUDIT_EVENT"),
                    request=request,
                    actor=request.user,
                    submission=submission,
                    submission_version=version,
                    reporting_period=period,
                    unit=unit,
                    entity_type=audit_event.get("entity_type", "collection"),
                    entity_id=audit_event.get("entity_id", item["local_id"]),
                    correlation_id=audit_event.get("correlation_id") or correlation_id,
                    metadata=audit_event.get("metadata", {}),
                    before=audit_event.get("before", {}),
                    after=audit_event.get("after", {}),
                    source=audit_event.get("source", "client_offline"),
                    client_event_id=audit_event.get("id"),
                )
            results.append(
                {
                    "localId": item["local_id"],
                    "submissionUuid": str(submission.client_submission_uuid),
                    "versionNumber": version.version_number,
                    "status": SubmissionVersion.STATUS_RECEIVED,
                    "syncedAt": version.synced_at.isoformat() if version.synced_at else None,
                    "idempotent": False,
                }
            )

        return Response({"results": results})


class ServerRecordsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        period_id = request.query_params.get("period")
        versions = SubmissionVersion.objects.select_related("submission", "submission__reporting_period")

        if period_id:
            versions = versions.filter(submission__reporting_period_id=period_id)

        data = SubmissionVersionSerializer(versions[:100], many=True).data
        return Response({"records": data})


class AuditEventListView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanViewAuditLog]

    def get(self, request):
        queryset = AuditEvent.objects.select_related("actor", "unit", "reporting_period").all()
        action = request.query_params.get("action")
        period_id = request.query_params.get("period")
        if action:
            queryset = queryset.filter(action=action)
        if period_id:
            queryset = queryset.filter(reporting_period_id=period_id)
        return Response({"events": AuditEventSerializer(queryset[:200], many=True).data})
