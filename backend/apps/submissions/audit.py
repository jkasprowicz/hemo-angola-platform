import uuid
from typing import Any, Dict, Optional, Tuple

from django.http import HttpRequest

from .models import AuditEvent, ReportingPeriod, Submission, SubmissionVersion


def _request_metadata(request: Optional[HttpRequest]) -> Tuple[Optional[str], str]:
    if request is None:
        return None, ""
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    ip_address = forwarded_for.split(",")[0].strip() if forwarded_for else request.META.get("REMOTE_ADDR")
    user_agent = request.META.get("HTTP_USER_AGENT", "")
    return ip_address, user_agent


class AuditService:
    def log(
        self,
        *,
        action: str,
        request: Optional[HttpRequest] = None,
        actor=None,
        submission: Optional[Submission] = None,
        submission_version: Optional[SubmissionVersion] = None,
        reporting_period: Optional[ReportingPeriod] = None,
        unit=None,
        entity_type: str = "",
        entity_id: str = "",
        correlation_id: Optional[str] = None,
        source: str = "server",
        metadata: Optional[Dict[str, Any]] = None,
        before: Optional[Dict[str, Any]] = None,
        after: Optional[Dict[str, Any]] = None,
        client_event_id: Optional[str] = None,
    ) -> AuditEvent:
        actor = actor or getattr(request, "user", None)
        ip_address, user_agent = _request_metadata(request)
        event, _ = AuditEvent.objects.get_or_create(
            public_id=client_event_id or uuid.uuid4(),
            defaults={
                "event_type": action.lower(),
                "action": action,
                "actor": actor if getattr(actor, "is_authenticated", False) else None,
                "actor_username": getattr(actor, "username", "") if getattr(actor, "is_authenticated", False) else "",
                "actor_display_name": (actor.get_full_name() or actor.username) if getattr(actor, "is_authenticated", False) else "",
                "actor_role": getattr(getattr(actor, "profile", None), "role", ""),
                "submission": submission,
                "submission_version": submission_version,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "unit": unit or getattr(submission, "unit", None),
                "reporting_period": reporting_period or getattr(submission, "reporting_period", None),
                "correlation_id": correlation_id or "",
                "source": source,
                "ip_address": ip_address,
                "user_agent": user_agent[:1024],
                "metadata": metadata or {},
                "before": before or {},
                "after": after or {},
            },
        )
        return event


audit_service = AuditService()
