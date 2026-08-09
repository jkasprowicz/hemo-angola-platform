from django.contrib.auth import authenticate, login, logout
from django.conf import settings
from django.db import connection
from django.http import JsonResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.serializers import (
    CollectionModuleSerializer,
    CollectionVariableSerializer,
    IndicatorDefinitionSerializer,
    InstitutionSerializer,
    ReportingPeriodSerializer,
    UnitSerializer,
)
from apps.submissions.audit import audit_service
from apps.submissions.models import CollectionModule, CollectionVariable, IndicatorDefinition, ReportingPeriod


class HealthView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()

        return Response(
            {
                "status": "ok",
                "database": "ok",
                "authentication": "session",
                "csrf": "enabled",
                "pipeline": [
                    "submission",
                    "validation",
                    "accepted_data",
                    "consolidation",
                    "dashboard",
                ],
            }
        )


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfTokenView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return JsonResponse({"detail": "CSRF cookie definido."})


class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        username = request.data.get("username", "").strip()
        password = request.data.get("password", "")
        user = authenticate(request, username=username, password=password)

        if not user:
            audit_service.log(
                action="AUTH_LOGIN_FAILED",
                request=request,
                entity_type="auth_session",
                entity_id=username,
                metadata={"username": username},
            )
            return Response(
                {"detail": "Usuário ou senha inválidos."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        login(request, user)
        audit_service.log(
            action="AUTH_LOGIN_SUCCESS",
            request=request,
            actor=user,
            entity_type="auth_session",
            entity_id=user.username,
            metadata={"username": user.username},
        )
        return Response({"detail": "Sessão iniciada com sucesso."})


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        audit_service.log(
            action="AUTH_LOGOUT",
            request=request,
            actor=request.user,
            entity_type="auth_session",
            entity_id=request.user.username,
            metadata={"username": request.user.username},
        )
        logout(request)
        return Response({"detail": "Sessão encerrada com sucesso."})


class SessionView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"authenticated": False})

        profile = request.user.profile
        return Response(
            {
                "authenticated": True,
                "user": {
                    "username": request.user.username,
                    "full_name": request.user.get_full_name() or request.user.username,
                    "role": profile.role,
                },
            }
        )


class BootstrapView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = request.user.profile
        unit = profile.unit
        periods = list(
            ReportingPeriod.objects.filter(
                unit=unit,
                start_date__gte=settings.REPORTING_PERIOD_MIN,
                start_date__lte=settings.REPORTING_PERIOD_MAX,
            ).order_by("-reference_year", "-reference_month")
        )
        current_date = timezone.now()
        period = next(
            (
                item
                for item in periods
                if item.reference_year == current_date.year and item.reference_month == current_date.month
            ),
            periods[0] if periods else None,
        )
        modules = CollectionModule.objects.filter(active=True, is_demo=True)
        variables = CollectionVariable.objects.filter(active=True, is_demo=True).select_related("module")
        indicators = IndicatorDefinition.objects.filter(is_demo=True).select_related(
            "module",
            "numerator_variable",
            "denominator_variable",
        )

        return Response(
            {
                "institution": InstitutionSerializer(profile.institution).data,
                "unit": UnitSerializer(unit).data if unit else None,
                "reportingPeriod": ReportingPeriodSerializer(period).data if period else None,
                "reportingPeriods": ReportingPeriodSerializer(periods, many=True).data,
                "reportingPeriodPolicy": {
                    "minDate": settings.REPORTING_PERIOD_MIN.isoformat(),
                    "maxDate": settings.REPORTING_PERIOD_MAX.isoformat(),
                },
                "catalog": {
                    "modules": CollectionModuleSerializer(modules, many=True).data,
                    "variables": CollectionVariableSerializer(variables, many=True).data,
                    "indicators": IndicatorDefinitionSerializer(indicators, many=True).data,
                },
                "user": {
                    "username": request.user.username,
                    "full_name": request.user.get_full_name() or request.user.username,
                    "role": profile.role,
                },
                "demoNotice": "Configuração demonstrativa. Os indicadores definitivos serão priorizados e validados em conjunto com o Instituto Nacional de Sangue.",
            }
        )
