import os
import secrets
from contextlib import contextmanager

from django.core.management import call_command
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.test.utils import override_settings
from rest_framework.test import APIClient

from apps.core.services import ensure_demo_data
from apps.core.models import UserProfile
from apps.submissions.models import (
    AuditEvent,
    CollectionModule,
    CollectionVariable,
    IndicatorDefinition,
    Submission,
    SubmissionVersion,
)
from hemo_angola.settings import build_cors_allowed_origins, build_csrf_trusted_origins


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


def current_demo_password() -> str:
    password = os.environ.get("DJANGO_DEMO_PASSWORD", "").strip()
    if not password:
        raise AssertionError("DJANGO_DEMO_PASSWORD must be set for this test.")
    return password


@override_settings(ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"])
class HealthEndpointTests(TestCase):
    def setUp(self):
        self.demo_password_context = demo_password()
        self.demo_password_context.__enter__()
        self.addCleanup(self.demo_password_context.__exit__, None, None, None)
        ensure_demo_data()

    def test_health_endpoint_returns_expected_payload(self):
        response = APIClient().get("/api/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ok")
        self.assertEqual(response.data["database"], "ok")


@override_settings(ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"])
class AuthAndSyncFlowTests(TestCase):
    def setUp(self):
        self.demo_password_context = demo_password()
        self.demo_password_context.__enter__()
        self.addCleanup(self.demo_password_context.__exit__, None, None, None)
        ensure_demo_data()
        self.client = APIClient(enforce_csrf_checks=True)

    def _get_csrf_cookie(self):
        response = self.client.get("/api/auth/csrf/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("csrftoken", response.cookies)
        return response.cookies["csrftoken"].value

    def _login(self):
        csrf_cookie = self._get_csrf_cookie()
        response = self.client.post(
            "/api/auth/login/",
            {"username": "operador", "password": current_demo_password()},
            format="json",
            HTTP_X_CSRFTOKEN=csrf_cookie,
        )
        self.assertEqual(response.status_code, 200)
        return self.client.cookies["csrftoken"].value

    def test_csrf_endpoint_returns_cookie(self):
        csrf_cookie = self._get_csrf_cookie()
        self.assertTrue(csrf_cookie)

    def test_login_invalid_returns_400(self):
        csrf_cookie = self._get_csrf_cookie()
        response = self.client.post(
            "/api/auth/login/",
            {"username": "operador", "password": "senha-incorreta"},
            format="json",
            HTTP_X_CSRFTOKEN=csrf_cookie,
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            AuditEvent.objects.filter(action="AUTH_LOGIN_FAILED").count(),
            1,
        )

    @override_settings(CSRF_TRUSTED_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"])
    def test_login_valid_from_localhost_origin_returns_200(self):
        csrf_cookie = self._get_csrf_cookie()
        response = self.client.post(
            "/api/auth/login/",
            {"username": "operador", "password": current_demo_password()},
            format="json",
            HTTP_X_CSRFTOKEN=csrf_cookie,
            HTTP_ORIGIN="http://localhost:5173",
        )
        self.assertEqual(response.status_code, 200)

    def test_authenticated_session_and_logout(self):
        csrf_cookie = self._login()
        session_response = self.client.get("/api/auth/session/")
        self.assertEqual(session_response.status_code, 200)
        self.assertTrue(session_response.data["authenticated"])
        self.assertEqual(session_response.data["user"]["username"], "operador")

        logout_response = self.client.post("/api/auth/logout/", {}, format="json", HTTP_X_CSRFTOKEN=csrf_cookie)
        self.assertEqual(logout_response.status_code, 200)
        self.assertEqual(AuditEvent.objects.filter(action="AUTH_LOGIN_SUCCESS").count(), 1)
        self.assertEqual(AuditEvent.objects.filter(action="AUTH_LOGOUT").count(), 1)

        session_after_logout = self.client.get("/api/auth/session/")
        self.assertEqual(session_after_logout.status_code, 200)
        self.assertFalse(session_after_logout.data["authenticated"])

    @override_settings(CSRF_TRUSTED_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"])
    def test_logout_valid_from_localhost_origin_returns_200_and_clears_session(self):
        csrf_cookie = self._login()

        logout_response = self.client.post(
            "/api/auth/logout/",
            {},
            format="json",
            HTTP_X_CSRFTOKEN=csrf_cookie,
            HTTP_ORIGIN="http://127.0.0.1:5173",
        )

        self.assertEqual(logout_response.status_code, 200)
        session_after_logout = self.client.get("/api/auth/session/")
        self.assertEqual(session_after_logout.status_code, 200)
        self.assertFalse(session_after_logout.data["authenticated"])

    def test_bootstrap_returns_demo_catalog(self):
        self._login()

        response = self.client.get("/api/bootstrap/")

        self.assertEqual(response.status_code, 200)
        self.assertIn("catalog", response.data)
        self.assertEqual(
            response.data["demoNotice"],
            "Configuração demonstrativa. Os indicadores definitivos serão priorizados e validados em conjunto com o Instituto Nacional de Sangue.",
        )
        self.assertIn("reportingPeriodPolicy", response.data)
        self.assertIn("start_date", response.data["reportingPeriod"])
        self.assertIn("end_date", response.data["reportingPeriod"])
        self.assertEqual(len(response.data["catalog"]["modules"]), 3)
        self.assertEqual(len(response.data["catalog"]["variables"]), 6)
        self.assertEqual(len(response.data["catalog"]["indicators"]), 3)
        self.assertEqual(
            [module["code"] for module in response.data["catalog"]["modules"]],
            [
                "donation_capture",
                "clinical_screening",
                "laboratory_screening",
            ],
        )
        self.assertNotIn(
            "delayed_serology_releases_count",
            [variable["code"] for variable in response.data["catalog"]["variables"]],
        )
        self.assertNotIn(
            "processed_units_count",
            [variable["code"] for variable in response.data["catalog"]["variables"]],
        )

    @override_settings(CSRF_TRUSTED_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"])
    def test_sync_persists_submission_data_and_is_idempotent(self):
        csrf_cookie = self._login()
        bootstrap = self.client.get("/api/bootstrap/")
        unit = bootstrap.data["unit"]
        institution = bootstrap.data["institution"]
        period = bootstrap.data["reportingPeriod"]

        payload = {
            "items": [
                {
                    "local_id": "local-1",
                    "submission_uuid": "199a8465-1ea8-470a-8ea1-80b3504afb63",
                    "version_uuid": "2e41ed8d-86ef-4f55-b98f-06a7f8ca267d",
                    "version_number": 1,
                    "institution_id": institution["id"],
                    "unit_id": unit["id"],
                    "reporting_period_id": period["id"],
                    "payload": {"field": "value"},
                    "validation_summary": {"valid": True},
                    "closed_at": "2026-08-08T00:00:00Z",
                }
            ]
        }

        current_csrf = self.client.cookies["csrftoken"].value
        response_one = self.client.post(
            "/api/sync/",
            payload,
            format="json",
            HTTP_X_CSRFTOKEN=current_csrf,
            HTTP_ORIGIN="http://localhost:5173",
        )
        response_two = self.client.post(
            "/api/sync/",
            payload,
            format="json",
            HTTP_X_CSRFTOKEN=current_csrf,
            HTTP_ORIGIN="http://localhost:5173",
        )

        self.assertEqual(response_one.status_code, 200)
        self.assertEqual(response_two.status_code, 200)
        self.assertEqual(Submission.objects.count(), 1)
        self.assertEqual(SubmissionVersion.objects.count(), 1)
        submission = Submission.objects.get()
        version = SubmissionVersion.objects.get()
        self.assertEqual(submission.institution_id, institution["id"])
        self.assertEqual(submission.unit_id, unit["id"])
        self.assertEqual(submission.reporting_period_id, period["id"])
        self.assertEqual(submission.current_status, Submission.STATUS_SYNCED)
        self.assertEqual(version.status, SubmissionVersion.STATUS_RECEIVED)
        self.assertEqual(version.payload["field"], "value")
        self.assertEqual(version.validation_summary["valid"], True)
        self.assertEqual(
            AuditEvent.objects.filter(
                submission=submission,
                action="SUBMISSION_SYNC_SUCCEEDED",
            ).count(),
            1,
        )
        self.assertEqual(
            AuditEvent.objects.filter(
                submission=submission,
                action="SUBMISSION_RECEIVED",
            ).count(),
            1,
        )
        self.assertEqual(response_one.data["results"][0]["status"], SubmissionVersion.STATUS_RECEIVED)
        self.assertEqual(response_two.data["results"][0]["status"], SubmissionVersion.STATUS_RECEIVED)
        self.assertFalse(response_one.data["results"][0]["idempotent"])
        self.assertTrue(response_two.data["results"][0]["idempotent"])


@override_settings(ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"])
class SeedDemoDataTests(TestCase):
    def test_seed_demo_data_is_idempotent_and_creates_expected_users(self):
        with demo_password():
            call_command("seed_demo_data")
            call_command("seed_demo_data")

        self.assertEqual(User.objects.filter(username="operador").count(), 1)
        self.assertEqual(User.objects.filter(username="revisor").count(), 1)
        self.assertEqual(User.objects.filter(username="gestor").count(), 1)
        self.assertEqual(User.objects.filter(username="admin").count(), 1)
        self.assertEqual(UserProfile.objects.filter(user__username="operador", role="operator").count(), 1)
        self.assertEqual(CollectionVariable.objects.filter(code="delayed_serology_releases_count").count(), 0)

    def test_seed_demo_data_reset_rebuilds_demo_baseline(self):
        with demo_password():
            call_command("seed_demo_data")
        IndicatorDefinition.objects.filter(is_demo=True).delete()
        CollectionVariable.objects.filter(is_demo=True).delete()
        CollectionModule.objects.filter(is_demo=True).delete()

        with demo_password():
            call_command("seed_demo_data", reset=True)

        self.assertEqual(CollectionModule.objects.filter(is_demo=True).count(), 3)
        self.assertEqual(CollectionVariable.objects.filter(is_demo=True).count(), 6)
        self.assertEqual(IndicatorDefinition.objects.filter(is_demo=True).count(), 3)
        self.assertEqual(UserProfile.objects.filter(user__username="operador", role="operator").count(), 1)

    def test_seed_demo_data_requires_explicit_password(self):
        previous_password = os.environ.pop("DJANGO_DEMO_PASSWORD", None)
        try:
            with self.assertRaisesMessage(Exception, "Provide --demo-password or DJANGO_DEMO_PASSWORD"):
                call_command("seed_demo_data")
        finally:
            if previous_password is not None:
                os.environ["DJANGO_DEMO_PASSWORD"] = previous_password


class CsrfTrustedOriginsSettingsTests(TestCase):
    def test_build_csrf_trusted_origins_uses_explicit_env_when_present(self):
        previous_debug = os.environ.get("DJANGO_DEBUG")
        previous_origins = os.environ.get("DJANGO_CSRF_TRUSTED_ORIGINS")
        try:
            os.environ["DJANGO_DEBUG"] = "False"
            os.environ["DJANGO_CSRF_TRUSTED_ORIGINS"] = "https://demo.example.com,https://app.example.com"
            self.assertEqual(
                build_csrf_trusted_origins(),
                ["https://demo.example.com", "https://app.example.com"],
            )
        finally:
            if previous_debug is None:
                os.environ.pop("DJANGO_DEBUG", None)
            else:
                os.environ["DJANGO_DEBUG"] = previous_debug
            if previous_origins is None:
                os.environ.pop("DJANGO_CSRF_TRUSTED_ORIGINS", None)
            else:
                os.environ["DJANGO_CSRF_TRUSTED_ORIGINS"] = previous_origins

    def test_build_csrf_trusted_origins_defaults_to_local_dev_origins_in_debug(self):
        previous_debug = os.environ.get("DJANGO_DEBUG")
        previous_origins = os.environ.get("DJANGO_CSRF_TRUSTED_ORIGINS")
        previous_frontend_url = os.environ.get("FRONTEND_URL")
        try:
            os.environ["DJANGO_DEBUG"] = "True"
            os.environ.pop("DJANGO_CSRF_TRUSTED_ORIGINS", None)
            self.assertEqual(
                build_csrf_trusted_origins(),
                ["http://localhost:5173", "http://127.0.0.1:5173"],
            )
        finally:
            if previous_debug is None:
                os.environ.pop("DJANGO_DEBUG", None)
            else:
                os.environ["DJANGO_DEBUG"] = previous_debug
            if previous_origins is None:
                os.environ.pop("DJANGO_CSRF_TRUSTED_ORIGINS", None)
            else:
                os.environ["DJANGO_CSRF_TRUSTED_ORIGINS"] = previous_origins
            if previous_frontend_url is None:
                os.environ.pop("FRONTEND_URL", None)
            else:
                os.environ["FRONTEND_URL"] = previous_frontend_url

    def test_build_cors_allowed_origins_uses_explicit_env_when_present(self):
        previous_origins = os.environ.get("DJANGO_CORS_ALLOWED_ORIGINS")
        try:
            os.environ["DJANGO_CORS_ALLOWED_ORIGINS"] = "https://demo.example.com,https://app.example.com"
            self.assertEqual(
                build_cors_allowed_origins(),
                ["https://demo.example.com", "https://app.example.com"],
            )
        finally:
            if previous_origins is None:
                os.environ.pop("DJANGO_CORS_ALLOWED_ORIGINS", None)
            else:
                os.environ["DJANGO_CORS_ALLOWED_ORIGINS"] = previous_origins

    def test_build_cors_allowed_origins_falls_back_to_csrf_origins(self):
        previous_debug = os.environ.get("DJANGO_DEBUG")
        previous_csrf = os.environ.get("DJANGO_CSRF_TRUSTED_ORIGINS")
        previous_cors = os.environ.get("DJANGO_CORS_ALLOWED_ORIGINS")
        try:
            os.environ["DJANGO_DEBUG"] = "True"
            os.environ.pop("DJANGO_CSRF_TRUSTED_ORIGINS", None)
            os.environ.pop("DJANGO_CORS_ALLOWED_ORIGINS", None)
            self.assertEqual(
                build_cors_allowed_origins(),
                ["http://localhost:5173", "http://127.0.0.1:5173"],
            )
        finally:
            if previous_debug is None:
                os.environ.pop("DJANGO_DEBUG", None)
            else:
                os.environ["DJANGO_DEBUG"] = previous_debug
            if previous_csrf is None:
                os.environ.pop("DJANGO_CSRF_TRUSTED_ORIGINS", None)
            else:
                os.environ["DJANGO_CSRF_TRUSTED_ORIGINS"] = previous_csrf
            if previous_cors is None:
                os.environ.pop("DJANGO_CORS_ALLOWED_ORIGINS", None)
            else:
                os.environ["DJANGO_CORS_ALLOWED_ORIGINS"] = previous_cors
