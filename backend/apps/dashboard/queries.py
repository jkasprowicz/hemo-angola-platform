from __future__ import annotations

from apps.submissions.models import SubmissionVersion


DASHBOARD_ELIGIBLE_STATUSES = (
    SubmissionVersion.STATUS_RECEIVED,
    SubmissionVersion.STATUS_ACCEPTED,
    SubmissionVersion.STATUS_CONSOLIDATED,
)


def get_dashboard_versions(*, unit_id: int | None = None, period_ids: list[int] | None = None):
    queryset = SubmissionVersion.objects.select_related(
        "submission",
        "submission__unit",
        "submission__reporting_period",
    ).filter(status__in=DASHBOARD_ELIGIBLE_STATUSES)

    if unit_id is not None:
        queryset = queryset.filter(submission__unit_id=unit_id)

    if period_ids:
        queryset = queryset.filter(submission__reporting_period_id__in=period_ids)

    return queryset.order_by("submission_id", "-version_number", "-created_at")
