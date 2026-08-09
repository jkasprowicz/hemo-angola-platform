from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.submissions.audit import audit_service

from .serializers import DashboardFilterSerializer
from .services import build_dashboard_payload


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = DashboardFilterSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        filters = serializer.validated_data

        payload = build_dashboard_payload(
            unit_id=filters.get("unit_id"),
            period_from_id=filters.get("period_from"),
            period_to_id=filters.get("period_to"),
        )

        audit_service.log(
            action="DASHBOARD_VIEWED",
            request=request,
            actor=request.user,
            entity_type="dashboard",
            entity_id="dashboard_mvp",
            metadata={
                "unit_id": payload["filters"]["unit_id"],
                "period_from": payload["filters"]["period_from"],
                "period_to": payload["filters"]["period_to"],
                "empty": payload["empty"],
            },
        )

        return Response(payload)
