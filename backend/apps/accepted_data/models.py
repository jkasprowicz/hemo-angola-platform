from django.db import models

from apps.submissions.models import SubmissionVersion


class AcceptedData(models.Model):
    submission_version = models.OneToOneField(SubmissionVersion, on_delete=models.CASCADE, related_name="accepted_data")
    accepted_at = models.DateTimeField(auto_now_add=True)
    accepted_payload = models.JSONField(default=dict, blank=True)

    def __str__(self) -> str:
        return f"AcceptedData({self.submission_version_id})"

