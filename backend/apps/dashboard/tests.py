import os
import secrets
import uuid
from contextlib import contextmanager
from typing import Dict, Optional

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.test.utils import override_settings
from rest_framework.test import APIClient

from apps.core.models import Institution, Unit
from apps.core.services import ensure_demo_data
from apps.submissions.models import ReportingPeriod, Submission, SubmissionVersion


User = get_user_model()


@contextmanager
def demo_password(password: str = ""):
    if not password:
        password = secrets.token_urlsafe(18)
    previous_password = os.environ.get("DJANGO_DEMO_PASSWORD")
    os.environ["DJANGO_DEMO_PASSWORD"] = password
    try:
        yield
    finally:
        if previous_password is None:
            os.environ.pop("DJANGO_DEMO_PASSWORD", None)
        else:
            os.environ["DJANGO_DEMO_PASSWORD"] = previous_password


@override_settings(
    ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"],
    CSRF_TRUSTED_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"],
)
class DashboardViewTests(TestCase):
    def setUp(self):
        self.demo_password_context = demo_password()
        self.demo_password_context.__enter__()
        self.addCleanup(self.demo_password_context.__exit__, None, None, None)
        ensure_demo_data()
        self.client = APIClient(enforce_csrf_checks=True)
        self.user = User.objects.get(username="operador")
        self.client.force_authenticate(user=self.user)
        self.institution = Institution.objects.get(is_demo=True)
        self.unit = Unit.objects.get(is_demo=True)
        self.january = ReportingPeriod.objects.get(unit=self.unit, reference_year=2026, reference_month=1)
        self.february = ReportingPeriod.objects.get(unit=self.unit, reference_year=2026, reference_month=2)
        self.march = ReportingPeriod.objects.get(unit=self.unit, reference_year=2026, reference_month=3)

    def _create_version(
        self,
        *,
        period: ReportingPeriod,
        responses: Dict[str, int],
        unit: Optional[Unit] = None,
        submission_uuid: Optional[uuid.UUID] = None,
        version_number: int = 1,
        status: str = SubmissionVersion.STATUS_RECEIVED,
    ):
        submission = Submission.objects.create(
            institution=self.institution,
            unit=unit or self.unit,
            reporting_period=period,
            created_by=self.user,
            current_status=Submission.STATUS_SYNCED,
            client_submission_uuid=submission_uuid or uuid.uuid4(),
        )
        return SubmissionVersion.objects.create(
            submission=submission,
            version_number=version_number,
            client_version_uuid=uuid.uuid4(),
            payload={"responses": responses},
            validation_summary={"valid": True},
            status=status,
            created_by=self.user,
        )

    def test_requires_authenticated_session(self):
        self.client.force_authenticate(user=None)

        response = self.client.get("/api/dashboard/")

        self.assertEqual(response.status_code, 403)

    def test_returns_empty_payload_when_no_received_data_exists(self):
        response = self.client.get("/api/dashboard/")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["empty"])
        self.assertEqual(response.data["summary"]["collections_received"], 0)
        self.assertEqual(response.data["summary"]["period_analyzed"], "Sem dados")
        self.assertEqual(len(response.data["indicators"]), 3)
        self.assertEqual(response.data["series"][0]["points"], [])
        self.assertEqual(response.data["table"], [])

    def test_returns_weighted_aggregation_for_single_period(self):
        self._create_version(
            period=self.january,
            responses={
                "donacoes_voluntarias": 50,
                "donacoes_reposicao": 50,
                "candidatos_aptos": 88,
                "candidatos_inaptos": 12,
                "amostras_testadas": 100,
                "amostras_reagentes": 2,
            },
        )

        response = self.client.get("/api/dashboard/")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["empty"])
        self.assertEqual(response.data["summary"]["collections_received"], 1)
        self.assertEqual(response.data["summary"]["period_analyzed"], self.january.label)
        indicators = {item["code"]: item for item in response.data["indicators"]}
        self.assertEqual(indicators["percentual_doacoes_voluntarias"]["value"], 50.0)
        self.assertEqual(indicators["taxa_inaptidao_clinica"]["value"], 12.0)
        self.assertEqual(indicators["taxa_reatividade"]["value"], 2.0)
        self.assertEqual(response.data["table"][0]["taxa_reatividade"], 2.0)

    def test_aggregates_multiple_submissions_in_same_period_using_weighted_base(self):
        self._create_version(
            period=self.january,
            responses={
                "donacoes_voluntarias": 10,
                "donacoes_reposicao": 0,
                "candidatos_aptos": 9,
                "candidatos_inaptos": 1,
                "amostras_testadas": 10,
                "amostras_reagentes": 0,
            },
        )
        self._create_version(
            period=self.january,
            responses={
                "donacoes_voluntarias": 30,
                "donacoes_reposicao": 60,
                "candidatos_aptos": 45,
                "candidatos_inaptos": 45,
                "amostras_testadas": 90,
                "amostras_reagentes": 9,
            },
        )

        response = self.client.get("/api/dashboard/")

        indicators = {item["code"]: item for item in response.data["indicators"]}
        self.assertEqual(indicators["percentual_doacoes_voluntarias"]["value"], 40.0)
        self.assertEqual(indicators["taxa_inaptidao_clinica"]["value"], 46.0)
        self.assertEqual(indicators["taxa_reatividade"]["value"], 9.0)
        self.assertEqual(response.data["table"][0]["trace"]["submission_count"], 2)

    def test_uses_latest_version_per_submission(self):
        submission_uuid = uuid.uuid4()
        submission = Submission.objects.create(
            institution=self.institution,
            unit=self.unit,
            reporting_period=self.january,
            created_by=self.user,
            current_status=Submission.STATUS_SYNCED,
            client_submission_uuid=submission_uuid,
        )
        SubmissionVersion.objects.create(
            submission=submission,
            version_number=1,
            client_version_uuid=uuid.uuid4(),
            payload={"responses": {"donacoes_voluntarias": 10, "donacoes_reposicao": 90}},
            validation_summary={"valid": True},
            status=SubmissionVersion.STATUS_RECEIVED,
            created_by=self.user,
        )
        SubmissionVersion.objects.create(
            submission=submission,
            version_number=2,
            client_version_uuid=uuid.uuid4(),
            payload={"responses": {"donacoes_voluntarias": 40, "donacoes_reposicao": 60}},
            validation_summary={"valid": True},
            status=SubmissionVersion.STATUS_RECEIVED,
            created_by=self.user,
        )

        response = self.client.get("/api/dashboard/")

        indicators = {item["code"]: item for item in response.data["indicators"]}
        self.assertEqual(indicators["percentual_doacoes_voluntarias"]["value"], 40.0)
        self.assertEqual(response.data["summary"]["collections_received"], 1)

    def test_filters_by_unit(self):
        other_unit = Unit.objects.create(
            institution=self.institution,
            name="Unidade Secundária",
            code="DEMO-02",
            is_demo=True,
        )
        other_period = ReportingPeriod.objects.create(
            institution=self.institution,
            unit=other_unit,
            label="Janeiro/2026",
            reference_year=2026,
            reference_month=1,
            start_date="2026-01-01",
            end_date="2026-01-31",
            status=ReportingPeriod.STATUS_CLOSED,
            is_demo=True,
        )
        self._create_version(
            period=self.january,
            responses={"donacoes_voluntarias": 20, "donacoes_reposicao": 80},
        )
        self._create_version(
            period=other_period,
            unit=other_unit,
            responses={"donacoes_voluntarias": 90, "donacoes_reposicao": 10},
        )

        response = self.client.get(f"/api/dashboard/?unit_id={other_unit.id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"]["unit"]["name"], "Unidade Secundária")
        indicators = {item["code"]: item for item in response.data["indicators"]}
        self.assertEqual(indicators["percentual_doacoes_voluntarias"]["value"], 90.0)

    def test_filters_by_period_interval_using_reporting_period_order(self):
        self._create_version(period=self.january, responses={"donacoes_voluntarias": 10, "donacoes_reposicao": 90})
        self._create_version(period=self.february, responses={"donacoes_voluntarias": 20, "donacoes_reposicao": 80})
        self._create_version(period=self.march, responses={"donacoes_voluntarias": 30, "donacoes_reposicao": 70})

        response = self.client.get(f"/api/dashboard/?period_from={self.february.id}&period_to={self.march.id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["label"] for row in response.data["table"]], [self.february.label, self.march.label])
        self.assertEqual(response.data["summary"]["period_analyzed"], f"{self.february.label} – {self.march.label}")

    def test_rejects_inverted_period_interval(self):
        response = self.client.get(f"/api/dashboard/?period_from={self.march.id}&period_to={self.february.id}")

        self.assertEqual(response.status_code, 400)
        self.assertIn("period_to", response.data)

    def test_returns_null_when_denominator_is_zero(self):
        self._create_version(
            period=self.january,
            responses={
                "donacoes_voluntarias": 0,
                "donacoes_reposicao": 0,
                "candidatos_aptos": 0,
                "candidatos_inaptos": 0,
                "amostras_testadas": 0,
                "amostras_reagentes": 0,
            },
        )

        response = self.client.get("/api/dashboard/")

        indicators = {item["code"]: item for item in response.data["indicators"]}
        self.assertIsNone(indicators["percentual_doacoes_voluntarias"]["value"])
        self.assertIsNone(indicators["taxa_inaptidao_clinica"]["value"])
        self.assertIsNone(indicators["taxa_reatividade"]["value"])

    def test_ignores_non_dashboard_statuses(self):
        self._create_version(
            period=self.january,
            responses={"donacoes_voluntarias": 25, "donacoes_reposicao": 75},
            status=SubmissionVersion.STATUS_QUEUED,
        )

        response = self.client.get("/api/dashboard/")

        self.assertTrue(response.data["empty"])
